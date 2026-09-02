import type {
  ImageSitemapUrlEntry,
} from '../application/ports/image-sitemap-source.port';
import { escapeXml } from '../application/services/sitemap-xml.renderer';

const URLSET_OPEN =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
const URLSET_CLOSE = '</urlset>\n';

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export class ImageSitemapGenerator {
  public renderUrl(entry: ImageSitemapUrlEntry): string {
    const images = entry.images.filter(
      (image) => isAbsoluteHttpUrl(image.imageLoc) && image.title.trim().length > 0,
    );
    if (images.length === 0 || !isAbsoluteHttpUrl(entry.loc)) {
      return '';
    }

    const lines = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
    for (const image of images) {
      lines.push('    <image:image>');
      lines.push(`      <image:loc>${escapeXml(image.imageLoc.trim())}</image:loc>`);
      lines.push(`      <image:title>${escapeXml(image.title.trim())}</image:title>`);
      lines.push('    </image:image>');
    }
    lines.push('  </url>\n');
    return `${lines.join('\n')}\n`;
  }

  public async build(
    streamEntries: (batchSize: number) => AsyncGenerator<readonly ImageSitemapUrlEntry[]>,
    batchSize: number,
  ): Promise<string> {
    const chunks: string[] = ['<?xml version="1.0" encoding="UTF-8"?>\n', URLSET_OPEN];

    for await (const batch of streamEntries(batchSize)) {
      for (const entry of batch) {
        const rendered = this.renderUrl(entry);
        if (rendered) {
          chunks.push(rendered);
        }
      }
    }

    chunks.push(URLSET_CLOSE);
    return chunks.join('');
  }
}

export { URLSET_OPEN, URLSET_CLOSE };
