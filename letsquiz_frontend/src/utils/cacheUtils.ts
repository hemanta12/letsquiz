/**
 * Cache utility functions for session management
 */

export interface CacheStats {
  totalCached: number;
  expiredCount: number;
  validCount: number;
  cacheSizeBytes: number;
}

export const calculateCacheStats = (
  cachedSessions: Record<number, any>,
  cacheExpirationMs: number
): CacheStats => {
  const now = Date.now();
  const sessions = Object.values(cachedSessions);

  const expiredCount = sessions.filter(
    (session) => now - session.timestamp >= cacheExpirationMs
  ).length;

  const validCount = sessions.length - expiredCount;

  // Rough estimate of cache size in bytes
  const cacheSizeBytes = JSON.stringify(cachedSessions).length * 2;

  return {
    totalCached: sessions.length,
    expiredCount,
    validCount,
    cacheSizeBytes,
  };
};

export const formatCacheSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const shouldCleanExpiredCache = (
  cachedSessions: Record<number, any>,
  cacheExpirationMs: number,
  threshold = 0.3 // Clean if 30% or more are expired
): boolean => {
  const stats = calculateCacheStats(cachedSessions, cacheExpirationMs);
  if (stats.totalCached === 0) return false;

  const expiredRatio = stats.expiredCount / stats.totalCached;
  return expiredRatio >= threshold;
};
