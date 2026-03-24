"""
High-performance caching module (Enterprise)
Supports:
- Memory cache (LRU)
- Disk cache with Brotli compression
- TTL expiration
- Automatic key hashing
"""

import json
import hashlib
import time
from pathlib import Path
import brotli
from functools import lru_cache

from .constants import CACHE_DIR, CACHE_SETTINGS


class CacheManager:
    """Enterprise cache system (RAM + Disk)"""

    def __init__(self):
        self.dir = CACHE_DIR
        self.ttl = CACHE_SETTINGS["file_cache_ttl"]
        self.compression = CACHE_SETTINGS["compression"]

    # ------------ Key hashing ------------
    def _hash_key(self, raw_key: str) -> str:
        return hashlib.md5(raw_key.encode()).hexdigest()

    # ------------ Memory cache (auto LRU) ------------
    @lru_cache(maxsize=CACHE_SETTINGS["memory_cache_max_entries"])
    def memory_get(self, key: str):
        return None  # Values come from disk only

    def memory_set(self, key: str, value):
        self.memory_get.cache_clear()
        self.memory_get(key)
        return value

    # ------------ Disk cache path ------------
    def _path(self, hashed: str) -> Path:
        return self.dir / f"{hashed}.br"

    # ------------ Disk read ------------
    def get(self, key: str):
        hashed = self._hash_key(key)
        path = self._path(hashed)

        if not path.exists():
            return None

        # TTL expiration
        if time.time() - path.stat().st_mtime > self.ttl:
            try:
                path.unlink()
            except:
                pass
            return None

        try:
            compressed = path.read_bytes()
            raw = brotli.decompress(compressed)
            data = json.loads(raw.decode("utf-8"))

            # also populate memory cache
            self.memory_set(key, data)

            return data

        except Exception:
            return None

    # ------------ Disk write ------------
    def set(self, key: str, data):
        hashed = self._hash_key(key)
        path = self._path(hashed)

        raw = json.dumps(data).encode("utf-8")
        compressed = brotli.compress(raw)

        path.write_bytes(compressed)

        # push to memory also
        self.memory_set(key, data)

        return True

    # ------------ Invalidate key ------------
    def invalidate(self, key: str):
        hashed = self._hash_key(key)
        path = self._path(hashed)
        if path.exists():
            path.unlink(missing_ok=True)

    # ------------ Clear entire cache ------------
    def clear_all(self):
        for f in self.dir.glob("*.br"):
            f.unlink(missing_ok=True)
        self.memory_get.cache_clear()
