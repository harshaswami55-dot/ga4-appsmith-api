from app.utils.cache import TTLCache


def test_ttl_cache_expires() -> None:
    now = [10.0]
    cache = TTLCache(5, clock=lambda: now[0])
    cache.set("answer", 42)
    assert cache.get("answer") == 42
    now[0] = 16.0
    assert cache.get("answer") is None


def test_disabled_cache_does_not_store() -> None:
    cache = TTLCache(0)
    cache.set("answer", 42)
    assert cache.get("answer") is None

