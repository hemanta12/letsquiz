/**
 * Cache utility functions for session management
 */

export interface CacheStats {
  totalCached: number;
  expiredCount: number;
  validCount: number;
  cacheSizeBytes: number;
}

export interface CachedSession {
  timestamp: number;
  // Add other session properties here if needed
  [key: string]: unknown;
}

export const calculateCacheStats = (
  cachedSessions: Record<number, CachedSession>,
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
  cachedSessions: Record<number, CachedSession>,
  cacheExpirationMs: number,
  threshold = 0.3 // Clean if 30% or more are expired
): boolean => {
  const stats = calculateCacheStats(cachedSessions, cacheExpirationMs);
  if (stats.totalCached === 0) return false;

  const expiredRatio = stats.expiredCount / stats.totalCached;
  return expiredRatio >= threshold;
};

/**
 * Session timeout and activity tracking utilities
 */

export interface SessionTimeoutConfig {
  inactivityTimeout: number; // milliseconds
  warningTime: number; // milliseconds before timeout to show warning
}

export const DEFAULT_SESSION_CONFIG: SessionTimeoutConfig = {
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  warningTime: 2 * 60 * 1000, // 2 minutes warning
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const getTokenExpirationTime = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

export const getTimeUntilTokenExpiry = (token: string): number => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return 0;
  return Math.max(0, expirationTime - Date.now());
};

export const shouldRefreshToken = (token: string, thresholdMs = 5 * 60 * 1000): boolean => {
  const timeUntilExpiry = getTimeUntilTokenExpiry(token);
  return timeUntilExpiry > 0 && timeUntilExpiry <= thresholdMs;
};

export const formatTimeRemaining = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${remainingSeconds}s`;
};
