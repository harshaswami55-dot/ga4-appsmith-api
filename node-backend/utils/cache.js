class TTLCache {
  constructor(ttlMs = 300000, now = () => Date.now()) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.items = new Map();
  }

  get(key) {
    if (this.ttlMs <= 0) return undefined;
    const item = this.items.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= this.now()) {
      this.items.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key, value) {
    if (this.ttlMs > 0) this.items.set(key, { value, expiresAt: this.now() + this.ttlMs });
    return value;
  }

  clear() {
    const count = this.items.size;
    this.items.clear();
    return count;
  }

  stats() {
    return { entries: this.items.size, ttlMs: this.ttlMs };
  }
}

module.exports = { TTLCache };

