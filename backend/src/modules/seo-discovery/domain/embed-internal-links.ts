export type InternalLinkTarget = {
  readonly anchorText: string;
  readonly href: string;
  readonly priority: number;
};

const HTML_SEGMENT = /(<[^>]+>)/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Embed up to `maxLinks` exact-match internal anchors in HTML descriptions.
 * Skips script, style, and existing anchor blocks to preserve markup integrity.
 */
export function embedInternalLinks(
  html: string,
  targets: readonly InternalLinkTarget[],
  maxLinks = 3,
): string {
  if (!html.trim() || targets.length === 0 || maxLinks <= 0) {
    return html;
  }

  const sorted = [...targets].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }
    return right.anchorText.length - left.anchorText.length;
  });

  let linksAdded = 0;
  let insideScript = 0;
  let insideStyle = 0;
  let insideAnchor = 0;
  const segments = html.split(HTML_SEGMENT);

  const linked = segments.map((segment) => {
    if (segment.startsWith('<')) {
      if (/^<script\b/i.test(segment)) {
        insideScript += 1;
      } else if (/^<\/script>/i.test(segment)) {
        insideScript = Math.max(0, insideScript - 1);
      } else if (/^<style\b/i.test(segment)) {
        insideStyle += 1;
      } else if (/^<\/style>/i.test(segment)) {
        insideStyle = Math.max(0, insideStyle - 1);
      } else if (/^<a\b/i.test(segment)) {
        insideAnchor += 1;
      } else if (/^<\/a>/i.test(segment)) {
        insideAnchor = Math.max(0, insideAnchor - 1);
      }
      return segment;
    }

    if (insideScript > 0 || insideStyle > 0 || insideAnchor > 0 || linksAdded >= maxLinks) {
      return segment;
    }
    if (!segment.trim()) {
      return segment;
    }

    let text = segment;
    for (const target of sorted) {
      if (linksAdded >= maxLinks) {
        break;
      }
      const anchor = target.anchorText.trim();
      if (!anchor) {
        continue;
      }
      const pattern = new RegExp(`\\b(${escapeRegExp(anchor)})\\b`, 'i');
      if (!pattern.test(text)) {
        continue;
      }
      text = text.replace(pattern, (match) => {
        if (linksAdded >= maxLinks) {
          return match;
        }
        linksAdded += 1;
        return `<a href="${target.href}">${match}</a>`;
      });
    }
    return text;
  });

  return linked.join('');
}
