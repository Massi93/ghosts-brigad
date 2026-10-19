/**
 * Ajoute la durée dans l'en-tête d'un fichier WebM produit par MediaRecorder.
 *
 * Les navigateurs écrivent le WebM « au fil de l'eau » sans l'élément Duration :
 * la vidéo se lit, mais les lecteurs affichent une durée inconnue et la barre de
 * progression ne fonctionne pas. On insère donc `Segment > Info > Duration`.
 *
 * Format EBML (Matroska) : chaque élément = ID (vint) + taille (vint) + données.
 */
import fs from "node:fs";
import { pipeline } from "node:stream/promises";

const ID = {
  EBML: 0x1a45dfa3,
  SEGMENT: 0x18538067,
  SEEK_HEAD: 0x114d9b74,
  INFO: 0x1549a966,
  TIMECODE_SCALE: 0x2ad7b1,
  DURATION: 0x4489,
  CLUSTER: 0x1f43b675,
};

const HEAD_BYTES = 256 * 1024; // l'en-tête Info se trouve toujours au début du fichier

/** Longueur d'un vint d'après son premier octet (0 si invalide). */
function vintLength(firstByte) {
  for (let len = 1; len <= 8; len += 1) {
    if (firstByte & (0x80 >> (len - 1))) return len;
  }
  return 0;
}

/** Lit un ID d'élément (marqueur de longueur conservé, comme dans la spec). */
function readId(buf, pos) {
  const len = vintLength(buf[pos]);
  if (!len || len > 4 || pos + len > buf.length) return null;
  let value = 0;
  for (let i = 0; i < len; i += 1) value = value * 256 + buf[pos + i];
  return { value, len };
}

/** Lit une taille d'élément ; `unknown` = taille « inconnue » (tous les bits à 1). */
function readSize(buf, pos) {
  const len = vintLength(buf[pos]);
  if (!len || pos + len > buf.length) return null;
  let value = BigInt(buf[pos] & (0xff >> len));
  for (let i = 1; i < len; i += 1) value = (value << 8n) | BigInt(buf[pos + i]);
  const unknown = value === (1n << BigInt(7 * len)) - 1n;
  return { value: Number(value), len, unknown };
}

/** Encode une taille sur `len` octets (retourne null si elle ne tient pas). */
function encodeSize(value, len) {
  if (value >= 2 ** (7 * len) - 1) return null;
  const out = Buffer.alloc(len);
  let v = BigInt(value);
  for (let i = len - 1; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  out[0] |= 0x80 >> (len - 1);
  return out;
}

/** Parcourt les éléments enfants entre `start` et `end`. */
function* children(buf, start, end) {
  let pos = start;
  while (pos < end) {
    const id = readId(buf, pos);
    if (!id) return;
    const size = readSize(buf, pos + id.len);
    if (!size) return;
    const dataStart = pos + id.len + size.len;
    yield { id: id.value, offset: pos, sizeOffset: pos + id.len, size, dataStart };
    if (size.unknown) return;
    pos = dataStart + size.value;
  }
}

/**
 * Écrit la durée (en ms) dans le fichier WebM.
 * @returns {Promise<boolean>} `true` si le fichier a été modifié
 */
export async function fixWebmDuration(file, durationMs) {
  if (!durationMs || durationMs <= 0) return false;

  const fd = await fs.promises.open(file, "r+");
  let head;
  let tailStart;
  let fileSize;
  try {
    const { size } = await fd.stat();
    fileSize = size;
    const buf = Buffer.alloc(Math.min(HEAD_BYTES, size));
    await fd.read(buf, 0, buf.length, 0);

    // 1. En-tête EBML puis Segment.
    const top = [...children(buf, 0, buf.length)].slice(0, 2);
    const [ebml, segment] = top;
    if (ebml?.id !== ID.EBML || segment?.id !== ID.SEGMENT) return false;

    // 2. Recherche de Segment > Info (on abandonne si un SeekHead est présent :
    //    ses positions absolues seraient faussées par l'insertion).
    let info = null;
    for (const el of children(buf, segment.dataStart, buf.length)) {
      if (el.id === ID.SEEK_HEAD || el.id === ID.CLUSTER) return false;
      if (el.id === ID.INFO) {
        info = el;
        break;
      }
    }
    if (!info || info.size.unknown) return false;
    const infoEnd = info.dataStart + info.size.value;
    if (infoEnd > buf.length) return false;

    // 3. Échelle de temps (1 ms par défaut) et Duration existante éventuelle.
    let timecodeScale = 1_000_000;
    let durationEl = null;
    for (const el of children(buf, info.dataStart, infoEnd)) {
      if (el.id === ID.TIMECODE_SCALE) {
        timecodeScale = Number(buf.readUIntBE(el.dataStart, Math.min(el.size.value, 6)));
      } else if (el.id === ID.DURATION) {
        durationEl = el;
      }
    }
    const durationValue = (durationMs * 1_000_000) / timecodeScale;

    // Cas simple : la Duration existe déjà → réécriture sur place.
    if (durationEl) {
      const out = Buffer.alloc(durationEl.size.value);
      if (out.length === 8) out.writeDoubleBE(durationValue);
      else if (out.length === 4) out.writeFloatBE(durationValue);
      else return false;
      await fd.write(out, 0, out.length, durationEl.dataStart);
      return true;
    }

    // 4. Construction du nouvel élément Duration (ID 0x4489, taille 8, float64).
    const durationBytes = Buffer.alloc(11);
    durationBytes.writeUInt16BE(ID.DURATION, 0);
    durationBytes[2] = 0x88; // taille = 8 (vint sur 1 octet)
    durationBytes.writeDoubleBE(durationValue, 3);

    const newInfoSize = info.size.value + durationBytes.length;
    const infoSizeBytes =
      encodeSize(newInfoSize, info.size.len) ?? encodeSize(newInfoSize, 8);
    const delta = durationBytes.length + infoSizeBytes.length - info.size.len;

    const parts = [
      buf.subarray(0, info.sizeOffset),
      infoSizeBytes,
      buf.subarray(info.dataStart, infoEnd),
      durationBytes,
    ];
    head = Buffer.concat(parts);

    // Si la taille du Segment est connue, elle grandit du même nombre d'octets.
    if (!segment.size.unknown) {
      const segSize = encodeSize(segment.size.value + delta, segment.size.len);
      if (!segSize) return false;
      segSize.copy(head, segment.sizeOffset);
    }
    tailStart = infoEnd;
  } finally {
    await fd.close();
  }

  // 5. Réécriture : nouvel en-tête + reste du fichier copié en flux, puis remplacement atomique.
  const tmp = `${file}.tmp`;
  const out = fs.createWriteStream(tmp);
  out.write(head);
  if (tailStart < fileSize) {
    await pipeline(fs.createReadStream(file, { start: tailStart }), out);
  } else {
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
  }
  await fs.promises.rename(tmp, file);
  return true;
}
