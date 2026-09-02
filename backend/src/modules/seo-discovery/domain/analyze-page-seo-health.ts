export type SeoHealthIssueType =
  | 'missing_canonical'
  | 'missing_title'
  | 'duplicate_title'
  | 'missing_h1'
  | 'empty_image_alt'
  | 'fetch_failed';

export type SeoHealthIssueFinding = {
  readonly issueType: SeoHealthIssueType;
  readonly severity: 'warning' | 'error';
  readonly detail: string;
};

export function extractTitleTags(html: string): readonly string[] {
  const titles: string[] = [];
  const pattern = /<title[^>]*>([\s\S]*?)<\/title>/gi;
  let match: RegExpExecArray | null = pattern.exec(html);
  while (match) {
    const title = (match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (title) {
      titles.push(title);
    }
    match = pattern.exec(html);
  }
  return titles;
}

export function hasCanonicalLink(html: string): boolean {
  return /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
}

export function hasPrimaryHeading(html: string): boolean {
  return /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
}

export function countImagesWithEmptyAlt(html: string): number {
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  let empty = 0;
  for (const tag of images) {
    const altMatch = /\balt=(["'])(.*?)\1/i.exec(tag);
    if (!altMatch || altMatch[2]?.trim().length === 0) {
      empty += 1;
    }
  }
  return empty;
}

export function analyzePageSeoHealth(
  html: string,
  options?: { readonly titleCounts?: ReadonlyMap<string, number> },
): readonly SeoHealthIssueFinding[] {
  const findings: SeoHealthIssueFinding[] = [];

  if (!hasCanonicalLink(html)) {
    findings.push({
      issueType: 'missing_canonical',
      severity: 'warning',
      detail: 'Page is missing a canonical link element.',
    });
  }

  const titles = extractTitleTags(html);
  if (titles.length === 0) {
    findings.push({
      issueType: 'missing_title',
      severity: 'error',
      detail: 'Page is missing a <title> element.',
    });
  } else if (titles.length > 1) {
    findings.push({
      issueType: 'duplicate_title',
      severity: 'error',
      detail: `Page has ${titles.length} <title> elements.`,
    });
  } else if (options?.titleCounts) {
    const count = options.titleCounts.get(titles[0] ?? '') ?? 0;
    if (count > 1) {
      findings.push({
        issueType: 'duplicate_title',
        severity: 'warning',
        detail: `Title "${titles[0]}" is duplicated across ${count} crawled pages.`,
      });
    }
  }

  if (!hasPrimaryHeading(html)) {
    findings.push({
      issueType: 'missing_h1',
      severity: 'warning',
      detail: 'Page is missing a primary <h1> heading.',
    });
  }

  const emptyAltCount = countImagesWithEmptyAlt(html);
  if (emptyAltCount > 0) {
    findings.push({
      issueType: 'empty_image_alt',
      severity: 'warning',
      detail: `${emptyAltCount} image(s) are missing non-empty alt text.`,
    });
  }

  return findings;
}
