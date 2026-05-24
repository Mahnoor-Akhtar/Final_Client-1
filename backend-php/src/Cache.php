<?php
namespace App;

/**
 * Simple file-based response cache for API GET requests.
 * Caches JSON responses for a configurable TTL (default 30 seconds).
 * Automatically invalidated on POST/PUT/DELETE to the same table.
 */
class Cache {
    private static string $cacheDir = '';

    public static function getCacheDir(): string {
        if (empty(self::$cacheDir)) {
            self::$cacheDir = sys_get_temp_dir() . '/pgc_api_cache';
        }
        if (!is_dir(self::$cacheDir)) {
            @mkdir(self::$cacheDir, 0777, true);
        }
        return self::$cacheDir;
    }

    /**
     * Generate a cache key from the request URI + query + user ID.
     */
    public static function key(string $uri, string $userId = ''): string {
        return md5($uri . '|' . $userId);
    }

    /**
     * Get cached data if it exists and hasn't expired.
     * Returns null if cache miss.
     */
    public static function get(string $key, int $ttl = 30): ?string {
        $file = self::getCacheDir() . '/' . $key . '.json';
        if (!file_exists($file)) {
            return null;
        }
        $mtime = filemtime($file);
        if ((time() - $mtime) > $ttl) {
            @unlink($file);
            return null;
        }
        return file_get_contents($file);
    }

    /**
     * Store data in cache.
     */
    public static function set(string $key, string $data): void {
        $file = self::getCacheDir() . '/' . $key . '.json';
        file_put_contents($file, $data, LOCK_EX);
    }

    /**
     * Invalidate all cache entries for a specific table pattern,
     * or flush the entire cache.
     */
    public static function invalidate(?string $tablePattern = null): void {
        $dir = self::getCacheDir();
        if (!is_dir($dir)) return;
        
        // Simple: just flush all cached files (they're short-lived anyway)
        $files = glob($dir . '/*.json');
        if ($files) {
            foreach ($files as $file) {
                @unlink($file);
            }
        }
    }
}
