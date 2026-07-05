const store = new Map<string, number[]>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  let timestamps = store.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= MAX_ATTEMPTS) {
    return false;
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}
