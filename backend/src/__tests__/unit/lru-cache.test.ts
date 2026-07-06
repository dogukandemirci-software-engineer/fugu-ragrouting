import { LRUCache } from '../../utils/lru-cache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<number>(3, 0);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts the least-recently-used entry when over capacity', () => {
    const cache = new LRUCache<number>(2, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a' (oldest)

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('treats a read as a use, protecting the entry from eviction', () => {
    const cache = new LRUCache<number>(2, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' now most-recently-used
    cache.set('c', 3); // evicts 'b', not 'a'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('overwrites an existing key without growing size', () => {
    const cache = new LRUCache<number>(2, 0);
    cache.set('a', 1);
    cache.set('a', 99);
    expect(cache.get('a')).toBe(99);
    expect(cache.size).toBe(1);
  });

  it('expires entries after the TTL elapses', () => {
    jest.useFakeTimers();
    try {
      const cache = new LRUCache<number>(5, 1000);
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      jest.advanceTimersByTime(1001);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size).toBe(0); // expired read evicts the dead entry
    } finally {
      jest.useRealTimers();
    }
  });

  it('never expires when ttlMs <= 0', () => {
    jest.useFakeTimers();
    try {
      const cache = new LRUCache<number>(5, 0);
      cache.set('a', 1);
      jest.advanceTimersByTime(10_000_000);
      expect(cache.get('a')).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clear() empties the cache', () => {
    const cache = new LRUCache<number>(5, 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
