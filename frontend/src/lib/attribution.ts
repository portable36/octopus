const ATTRIBUTION_KEY = 'octopus.attribution';

export type AttributionSnapshot = {
  landingPath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  firstTouchAt?: string;
  lastTouchAt?: string;
};

type StoredAttribution = {
  first: AttributionSnapshot;
  last: AttributionSnapshot;
};

function readStored(): StoredAttribution | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

function writeStored(value: StoredAttribution): void {
  window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
}

function pickParams(url: URL): AttributionSnapshot {
  const q = url.searchParams;
  const snap: AttributionSnapshot = {
    landingPath: `${url.pathname}${url.search}`,
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
  };
  const utmSource = q.get('utm_source');
  const utmMedium = q.get('utm_medium');
  const utmCampaign = q.get('utm_campaign');
  const utmTerm = q.get('utm_term');
  const utmContent = q.get('utm_content');
  const gclid = q.get('gclid');
  const fbclid = q.get('fbclid');
  if (utmSource) snap.utmSource = utmSource;
  if (utmMedium) snap.utmMedium = utmMedium;
  if (utmCampaign) snap.utmCampaign = utmCampaign;
  if (utmTerm) snap.utmTerm = utmTerm;
  if (utmContent) snap.utmContent = utmContent;
  if (gclid) snap.gclid = gclid;
  if (fbclid) snap.fbclid = fbclid;
  return snap;
}

function hasTouchSignals(snap: AttributionSnapshot): boolean {
  return Boolean(
    snap.utmSource ||
    snap.utmMedium ||
    snap.utmCampaign ||
    snap.utmTerm ||
    snap.utmContent ||
    snap.gclid ||
    snap.fbclid,
  );
}

/** Capture first/last touch from the current URL into sessionStorage. */
export function captureAttributionFromLocation(href = window.location.href): AttributionSnapshot {
  const now = new Date().toISOString();
  const incoming = pickParams(new URL(href));
  const existing = readStored();

  if (!existing) {
    const first = { ...incoming, firstTouchAt: now, lastTouchAt: now };
    writeStored({ first, last: first });
    return first;
  }

  if (!hasTouchSignals(incoming)) {
    return {
      ...existing.first,
      ...existing.last,
      firstTouchAt: existing.first.firstTouchAt,
      lastTouchAt: existing.last.lastTouchAt ?? now,
    };
  }

  const last = { ...incoming, lastTouchAt: now };
  writeStored({ first: existing.first, last });
  return {
    ...existing.first,
    ...last,
    firstTouchAt: existing.first.firstTouchAt,
    lastTouchAt: now,
  };
}

/** Checkout body: merge first + last touch (last wins on overlapping keys except timestamps). */
export function readAttributionForCheckout(): AttributionSnapshot | undefined {
  const stored = readStored();
  if (!stored) {
    return undefined;
  }
  return {
    ...stored.first,
    ...stored.last,
    firstTouchAt: stored.first.firstTouchAt,
    lastTouchAt: stored.last.lastTouchAt,
  };
}
