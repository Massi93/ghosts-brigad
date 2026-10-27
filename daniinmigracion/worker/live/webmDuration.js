/**
 * Ajoute la durée dans l'en-tête d'un fichier WebM produit par MediaRecorder.
 *
 * Les navigateurs écrivent le WebM « au fil de l'eau » sans l'élément Duration :
 * la vidéo se lit, mais les lecteurs affichent une durée inconnue et la barre de
 * progression ne fonctionne pas. On insère donc `Segment > Info > Duration`.
 *
 * L'en-tête se trouve toujours dans le premier morceau envoyé par le navigateur :
 * seul ce morceau est modifié (les suivants restent tels quels dans R2).
 *
 * Format EBML (Matroska) : chaque élément = ID (vint) + taille (vint) + données.
 */

const ID = {
  EBML: 0x1a45dfa3,
  SEGMENT: 0x18538067,
  SEEK_HEAD: 0x114d9b74,
  INFO: 0x1549a966,
  TIMECODE_SCALE: 0x2ad7b1,
  DURATION: 0x4489,
  CLUSTER: 0x1f43b675,
};

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
  const out = new Uint8Array(len);
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

function readUintBE(buf, start, length) {
  let value = 0;
  for (let i = 0; i < length; i += 1) value = value * 256 + buf[start + i];
  return value;
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Écrit la durée (en ms) dans le premier morceau d'un WebM.
 * @param {Uint8Array} head premier morceau (contient l'en-tête)
 * @returns {Uint8Array|null} morceau corrigé, ou `null` si rien à faire
 */
export function patchWebmDuration(head, durationMs) {
  if (!durationMs || durationMs <= 0 || !head?.length) return null;
  const buf = head;

  // 1. En-tête EBML puis Segment.
  const [ebml, segment] = [...children(buf, 0, buf.length)].slice(0, 2);
  if (ebml?.id !== ID.EBML || segment?.id !== ID.SEGMENT) return null;

  // 2. Recherche de Segment > Info (on abandonne si un SeekHead est présent :
  //    ses positions absolues seraient faussées par l'insertion).
  let info = null;
  for (const el of children(buf, segment.dataStart, buf.length)) {
    if (el.id === ID.SEEK_HEAD || el.id === ID.CLUSTER) return null;
    if (el.id === ID.INFO) {
      info = el;
      break;
    }
  }
  if (!info || info.size.unknown) return null;
  const infoEnd = info.dataStart + info.size.value;
  if (infoEnd > buf.length) return null;

  // 3. Échelle de temps (1 ms par défaut) et Duration existante éventuelle.
  let timecodeScale = 1_000_000;
  let durationEl = null;
  for (const el of children(buf, info.dataStart, infoEnd)) {
    if (el.id === ID.TIMECODE_SCALE) {
      timecodeScale = readUintBE(buf, el.dataStart, Math.min(el.size.value, 6)) || 1_000_000;
    } else if (el.id === ID.DURATION) {
      durationEl = el;
    }
  }
  const durationValue = (durationMs * 1_000_000) / timecodeScale;

  // Cas simple : la Duration existe déjà → réécriture sur place.
  if (durationEl) {
    const out = buf.slice();
    const view = new DataView(out.buffer, out.byteOffset + durationEl.dataStart, durationEl.size.value);
    if (durationEl.size.value === 8) view.setFloat64(0, durationValue);
    else if (durationEl.size.value === 4) view.setFloat32(0, durationValue);
    else return null;
    return out;
  }

  // 4. Nouvel élément Duration (ID 0x4489, taille 8, float64).
  const durationBytes = new Uint8Array(11);
  durationBytes[0] = 0x44;
  durationBytes[1] = 0x89;
  durationBytes[2] = 0x88; // taille = 8 (vint sur 1 octet)
  new DataView(durationBytes.buffer).setFloat64(3, durationValue);

  const newInfoSize = info.size.value + durationBytes.length;
  const infoSizeBytes = encodeSize(newInfoSize, info.size.len) ?? encodeSize(newInfoSize, 8);
  const delta = durationBytes.length + infoSizeBytes.length - info.size.len;

  const out = concat([
    buf.subarray(0, info.sizeOffset),
    infoSizeBytes,
    buf.subarray(info.dataStart, infoEnd),
    durationBytes,
    buf.subarray(infoEnd),
  ]);

  // Si la taille du Segment est connue, elle grandit du même nombre d'octets.
  if (!segment.size.unknown) {
    const segSize = encodeSize(segment.size.value + delta, segment.size.len);
    if (!segSize) return null;
    out.set(segSize, segment.sizeOffset);
  }
  return out;
}
