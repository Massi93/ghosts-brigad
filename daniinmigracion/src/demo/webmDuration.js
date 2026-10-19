/**
 * Version navigateur de server/live/webmDuration.js : écrit la durée dans
 * l'en-tête d'un WebM produit par MediaRecorder, pour que la barre de
 * progression du lecteur fonctionne. Retourne le Blob d'origine si le
 * format n'est pas celui attendu.
 */
const ID = { EBML: 0x1a45dfa3, SEGMENT: 0x18538067, SEEK_HEAD: 0x114d9b74, INFO: 0x1549a966, SCALE: 0x2ad7b1, DURATION: 0x4489, CLUSTER: 0x1f43b675 };

const vintLength = (b) => {
  for (let len = 1; len <= 8; len += 1) if (b & (0x80 >> (len - 1))) return len;
  return 0;
};

function readId(buf, pos) {
  const len = vintLength(buf[pos]);
  if (!len || len > 4 || pos + len > buf.length) return null;
  let value = 0;
  for (let i = 0; i < len; i += 1) value = value * 256 + buf[pos + i];
  return { value, len };
}

function readSize(buf, pos) {
  const len = vintLength(buf[pos]);
  if (!len || pos + len > buf.length) return null;
  let value = BigInt(buf[pos] & (0xff >> len));
  for (let i = 1; i < len; i += 1) value = (value << 8n) | BigInt(buf[pos + i]);
  return { value: Number(value), len, unknown: value === (1n << BigInt(7 * len)) - 1n };
}

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

function* children(buf, start, end) {
  let pos = start;
  while (pos < end) {
    const id = readId(buf, pos);
    if (!id) return;
    const size = readSize(buf, pos + id.len);
    if (!size) return;
    const dataStart = pos + id.len + size.len;
    yield { id: id.value, sizeOffset: pos + id.len, size, dataStart };
    if (size.unknown) return;
    pos = dataStart + size.value;
  }
}

export async function fixWebmDurationBlob(blob, durationMs) {
  if (!durationMs || durationMs <= 0) return blob;
  const buf = new Uint8Array(await blob.slice(0, 256 * 1024).arrayBuffer());
  const [ebml, segment] = [...children(buf, 0, buf.length)].slice(0, 2);
  if (ebml?.id !== ID.EBML || segment?.id !== ID.SEGMENT) return blob;

  let info = null;
  for (const el of children(buf, segment.dataStart, buf.length)) {
    if (el.id === ID.SEEK_HEAD || el.id === ID.CLUSTER) return blob;
    if (el.id === ID.INFO) {
      info = el;
      break;
    }
  }
  if (!info || info.size.unknown) return blob;
  const infoEnd = info.dataStart + info.size.value;
  if (infoEnd > buf.length) return blob;

  let scale = 1_000_000;
  for (const el of children(buf, info.dataStart, infoEnd)) {
    if (el.id === ID.SCALE) {
      scale = 0;
      for (let i = 0; i < el.size.value; i += 1) scale = scale * 256 + buf[el.dataStart + i];
    }
    if (el.id === ID.DURATION) return blob; // déjà présente
  }

  const duration = new Uint8Array(11);
  duration[0] = 0x44;
  duration[1] = 0x89;
  duration[2] = 0x88;
  new DataView(duration.buffer).setFloat64(3, (durationMs * 1_000_000) / scale);

  const infoSize = encodeSize(info.size.value + 11, info.size.len) ?? encodeSize(info.size.value + 11, 8);
  const delta = 11 + infoSize.length - info.size.len;
  const head = new Uint8Array(info.sizeOffset + infoSize.length + info.size.value + 11);
  head.set(buf.subarray(0, info.sizeOffset), 0);
  head.set(infoSize, info.sizeOffset);
  head.set(buf.subarray(info.dataStart, infoEnd), info.sizeOffset + infoSize.length);
  head.set(duration, info.sizeOffset + infoSize.length + info.size.value);
  if (!segment.size.unknown) {
    const segSize = encodeSize(segment.size.value + delta, segment.size.len);
    if (!segSize) return blob;
    head.set(segSize, segment.sizeOffset);
  }
  return new Blob([head, blob.slice(infoEnd)], { type: blob.type });
}
