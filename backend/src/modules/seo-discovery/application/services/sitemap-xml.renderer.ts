import type { SitemapUrlEntry } from '../ports/sitemap-source.port';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function renderSitemapUrl(entry: SitemapUrlEntry): string {
  const parts = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
  if (entry.lastmod) {
    parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  }
  if (entry.changefreq) {
    parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  }
  if (entry.priority !== undefined) {
    parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
  }
  parts.push('  </url>\n');
  return `${parts.join('\n')}\n`;
}

export async function buildSitemapXml(
  streamEntries: (batchSize: number) => AsyncGenerator<readonly SitemapUrlEntry[]>,
  batchSize: number,
): Promise<string> {
  const chunks: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>\n',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n',
  ];

  for await (const batch of streamEntries(batchSize)) {
    for (const entry of batch) {
      chunks.push(renderSitemapUrl(entry));
    }
  }

  chunks.push('</urlset>\n');
  return chunks.join('');
}
