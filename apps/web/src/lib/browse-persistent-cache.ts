const CACHE_NAME = 'aim-browse-data-v2';
const LEGACY_CACHE_NAMES = ['aim-browse-data-v1'];
const CACHE_PATH = '/__aim-browser-cache/browse/';
let legacyCleanupStarted = false;

interface PersistentEntry<T> {
  storedAt: number;
  value: T;
}

function cacheRequest(key: string): Request {
  return new Request(`${window.location.origin}${CACHE_PATH}${encodeURIComponent(key)}`);
}

function cleanupLegacyCaches(): void {
  if (legacyCleanupStarted || !('caches' in window)) return;
  legacyCleanupStarted = true;
  for (const name of LEGACY_CACHE_NAMES) void window.caches.delete(name);
}

export async function readPersistentBrowseEntry<T>(
  key: string,
  maxAgeMs: number,
): Promise<T | null> {
  if (!('caches' in window)) return null;
  cleanupLegacyCaches();

  try {
    const cache = await window.caches.open(CACHE_NAME);
    const request = cacheRequest(key);
    const response = await cache.match(request);
    if (!response) return null;

    const entry = await response.json() as PersistentEntry<T>;
    if (!Number.isFinite(entry.storedAt) || Date.now() - entry.storedAt > maxAgeMs) {
      await cache.delete(request);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function writePersistentBrowseEntry<T>(key: string, value: T): Promise<void> {
  if (!('caches' in window)) return;
  cleanupLegacyCaches();

  try {
    const cache = await window.caches.open(CACHE_NAME);
    const body: PersistentEntry<T> = { storedAt: Date.now(), value };
    await cache.put(
      cacheRequest(key),
      new Response(JSON.stringify(body), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch {
    // Private browsing and storage pressure may disable Cache Storage.
  }
}
