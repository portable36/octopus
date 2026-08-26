const SELECTED_STORE_KEY = 'octopus.vendor.selectedStoreId';
export const VENDOR_STORE_CHANGE_EVENT = 'octopus.vendor.selectedStoreId';

export function getSelectedStoreId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const value = sessionStorage.getItem(SELECTED_STORE_KEY);
  return value && value.length > 0 ? value : null;
}

export function setSelectedStoreId(storeId: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!storeId) {
    sessionStorage.removeItem(SELECTED_STORE_KEY);
  } else {
    sessionStorage.setItem(SELECTED_STORE_KEY, storeId);
  }
  window.dispatchEvent(new Event(VENDOR_STORE_CHANGE_EVENT));
}

export function subscribeSelectedStoreId(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(VENDOR_STORE_CHANGE_EVENT, listener);
  return () => window.removeEventListener(VENDOR_STORE_CHANGE_EVENT, listener);
}
