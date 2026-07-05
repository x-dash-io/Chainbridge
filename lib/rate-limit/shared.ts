type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type StoreEntry = {
  timestamps: number[];
};

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  "stk-push": { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  "password-reset": { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  "upload-signature": { windowMs: 60 * 60 * 1000, maxRequests: 20 },
};

function createInMemoryStore() {
  const store = new Map<string, StoreEntry>();

  function cleanExpired(windowMs: number, timestamps: number[]): number[] {
    const now = Date.now();
    const cutoff = now - windowMs;
    return timestamps.filter((t) => t > cutoff);
  }

  return {
    check(key: string, config: RateLimitConfig): boolean {
      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      entry.timestamps = cleanExpired(config.windowMs, entry.timestamps);

      if (entry.timestamps.length >= config.maxRequests) {
        return false;
      }

      entry.timestamps.push(Date.now());
      return true;
    },

    getRemaining(key: string, config: RateLimitConfig): number {
      const entry = store.get(key);
      if (!entry) return config.maxRequests;

      const cleaned = cleanExpired(config.windowMs, entry.timestamps);
      return Math.max(0, config.maxRequests - cleaned.length);
    },

    reset(key: string): void {
      store.delete(key);
    },
  };
}

export const rateLimitStore = createInMemoryStore();

export function checkRateLimit(
  key: string,
  scope: keyof typeof DEFAULT_CONFIGS = "stk-push",
): boolean {
  const config = DEFAULT_CONFIGS[scope];
  return rateLimitStore.check(key, config);
}

export function getRateLimitRemaining(
  key: string,
  scope: keyof typeof DEFAULT_CONFIGS = "stk-push",
): number {
  const config = DEFAULT_CONFIGS[scope];
  return rateLimitStore.getRemaining(key, config);
}

export function resetRateLimit(
  key: string,
  scope?: keyof typeof DEFAULT_CONFIGS,
): void {
  if (scope) {
    rateLimitStore.reset(key);
  }
}
