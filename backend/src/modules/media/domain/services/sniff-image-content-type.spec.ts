import { describe, expect, it } from 'vitest';
import { decodeContentPrefixBase64, sniffImageContentType } from './sniff-image-content-type';

describe('sniffImageContentType', () => {
  it('detects png/jpeg/gif/webp', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageContentType(png)).toBe('image/png');

    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffImageContentType(jpeg)).toBe('image/jpeg');

    const gif = Buffer.from('GIF89aXXXXXX', 'ascii');
    expect(sniffImageContentType(gif)).toBe('image/gif');

    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0);
    webp.write('WEBP', 8);
    expect(sniffImageContentType(webp)).toBe('image/webp');
  });

  it('rejects unknown / short buffers', () => {
    expect(sniffImageContentType(Buffer.from('not-an-image!!'))).toBeNull();
    expect(sniffImageContentType(Buffer.from([1, 2, 3]))).toBeNull();
  });

  it('decodes base64 prefixes', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(decodeContentPrefixBase64(png.toString('base64')).equals(png)).toBe(true);
  });
});
