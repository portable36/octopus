export function hasPlatformAdminRole(roles: readonly string[]): boolean {
  return roles.includes('PLATFORM_ADMIN');
}

export function hasVendorRole(roles: readonly string[]): boolean {
  return roles.some((role) => role === 'VENDOR_OWNER' || role === 'VENDOR_STAFF');
}

export function canAccessVendor(
  roles: readonly string[],
  vendorId: string | null,
  authorizedVendorIds: readonly string[],
): boolean {
  return hasVendorRole(roles) && (vendorId === null || authorizedVendorIds.includes(vendorId));
}
