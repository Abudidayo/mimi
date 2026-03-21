const GUEST_OWNER_KEY_STORAGE_KEY = "civ-ai.convex-guest-owner-key";
const ACTIVE_SESSION_STORAGE_PREFIX = "civ-ai.active-session";

export function getStoredGuestOwnerKey(): string | null {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(GUEST_OWNER_KEY_STORAGE_KEY);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}`;
  window.localStorage.setItem(GUEST_OWNER_KEY_STORAGE_KEY, created);
  return created;
}

function getActiveSessionStorageKey(ownerKey?: string) {
  return ownerKey ? `${ACTIVE_SESSION_STORAGE_PREFIX}:${ownerKey}` : null;
}

export function readStoredActiveSessionId(ownerKey?: string) {
  if (typeof window === "undefined") return null;

  const storageKey = getActiveSessionStorageKey(ownerKey);
  if (!storageKey) return null;
  return window.localStorage.getItem(storageKey);
}

export function writeStoredActiveSessionId(ownerKey: string, sessionId: string | null) {
  if (typeof window === "undefined") return;

  const storageKey = getActiveSessionStorageKey(ownerKey);
  if (!storageKey) return;

  if (!sessionId) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, sessionId);
}
