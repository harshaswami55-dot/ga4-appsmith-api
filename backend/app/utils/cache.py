import threading
import time
from collections.abc import Callable
from typing import Any


class TTLCache:
    def __init__(self, ttl_seconds: int = 300, clock: Callable[[], float] = time.monotonic):
        self.ttl_seconds = ttl_seconds
        self._clock = clock
        self._items: dict[str, tuple[float, Any]] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Any | None:
        if self.ttl_seconds <= 0:
            return None
        with self._lock:
            item = self._items.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= self._clock():
                self._items.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        if self.ttl_seconds <= 0:
            return
        with self._lock:
            self._items[key] = (self._clock() + self.ttl_seconds, value)

    def clear(self) -> int:
        with self._lock:
            count = len(self._items)
            self._items.clear()
            return count

    def stats(self) -> dict[str, int]:
        with self._lock:
            now = self._clock()
            expired = [key for key, (expires, _) in self._items.items() if expires <= now]
            for key in expired:
                self._items.pop(key, None)
            return {"entries": len(self._items), "ttl_seconds": self.ttl_seconds}

