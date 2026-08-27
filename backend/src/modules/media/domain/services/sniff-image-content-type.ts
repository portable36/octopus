/** Sniff image MIME from file header bytes (extension/client MIME are not trusted). */
export function sniffImageContentType(bytes: Buffer): string | null {
  if (bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function decodeContentPrefixBase64(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('contentPrefixBase64 is required.');
  }
  const buf = Buffer.from(trimmed, 'base64');
  if (buf.length < 12) {
    throw new Error('contentPrefixBase64 must decode to at least 12 bytes.');
  }
  // Cap prefix size so clients cannot flood the register path.
  if (buf.length > 64) {
    return buf.subarray(0, 64);
  }
  return buf;
}
