export type DestinationUser = {
  readonly roles: readonly string[];
  readonly mfaEnabled?: boolean;
};

export type PostLoginDestinationInput = {
  readonly user: DestinationUser;
  readonly vendorIds: readonly string[];
  readonly next?: string | null;
};

function isPlatformAdmin(user: DestinationUser): boolean {
  return user.roles.includes('PLATFORM_ADMIN');
}

function isVendorUser(user: DestinationUser): boolean {
  return user.roles.some((role) => role === 'VENDOR_OWNER' || role === 'VENDOR_STAFF');
}

function matchesVendorPath(pathname: string, vendorIds: readonly string[]): boolean {
  if (pathname === '/vendor') {
    return true;
  }
  const match = pathname.match(/^\/vendor\/([^/]+)(?:\/|$)/);
  return match !== null && vendorIds.includes(decodeURIComponent(match[1] ?? ''));
}

function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return null;
  }

  try {
    const url = new URL(next, 'https://octopus.invalid');
    if (url.origin !== 'https://octopus.invalid' || url.pathname === '/login') {
      return null;
    }
    return next;
  } catch {
    return null;
  }
}

function authorizedNextPath(input: PostLoginDestinationInput): string | null {
  const next = safeNextPath(input.next);
  if (!next) {
    return null;
  }

  const pathname = new URL(next, 'https://octopus.invalid').pathname;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return isPlatformAdmin(input.user) && input.user.mfaEnabled === true ? next : null;
  }
  if (pathname === '/vendor' || pathname.startsWith('/vendor/')) {
    return isVendorUser(input.user) && matchesVendorPath(pathname, input.vendorIds) ? next : null;
  }
  return next;
}

export function resolvePostLoginDestination(input: PostLoginDestinationInput): string {
  if (isPlatformAdmin(input.user) && input.user.mfaEnabled !== true) {
    return '/mfa/setup';
  }

  const next = authorizedNextPath(input);
  if (next) {
    return next;
  }

  if (isPlatformAdmin(input.user)) {
    return '/admin/dashboard';
  }
  if (isVendorUser(input.user)) {
    const vendorId = input.vendorIds[0];
    return input.vendorIds.length === 1 && vendorId ? `/vendor/${vendorId}` : '/vendor';
  }
  return '/account';
}
