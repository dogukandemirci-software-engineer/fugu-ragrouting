// Minimal dependency-free LRU cache with optional TTL. Backed by a Map, which
// preserves insertion order — re-inserting on access moves a key to the "most
// recently used" end, so the oldest key is always Map's first entry when we
// need to evict. Used for embedding memoization (identical queries re-embedded
// on every request otherwise), but generic enough for any hot read path.
interface Entry<V> {
  value: V;
  expiresAt: number; // epoch ms; Infinity when ttlMs <= 0
}

export class LRUCache<V> {
  private readonly store = new Map<string, Entry<V>>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number
  ) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency: delete + re-set moves it to the newest position.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    else if (this.store.size >= this.maxSize) {
      // Evict least-recently-used = first key in insertion order.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: this.ttlMs > 0 ? Date.now() + this.ttlMs : Infinity,
    });
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
