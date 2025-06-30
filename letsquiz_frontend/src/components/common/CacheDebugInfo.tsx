import React from 'react';
import { useAppSelector } from '../../hooks/reduxHooks';
import { calculateCacheStats, formatCacheSize, CachedSession } from '../../utils/cacheUtils';
import styles from './CacheDebugInfo.module.css';

interface CacheDebugInfoProps {
  enabled?: boolean;
}

// Shows cache statistics for debugging (dev mode or when enabled)
const CacheDebugInfo: React.FC<CacheDebugInfoProps> = ({ enabled = false }) => {
  const cachedSessionDetails = useAppSelector((state) => state.user.cachedSessionDetails) || {};

  if (!enabled && process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Cache duration: 5 minutes
  const CACHE_DURATION_MS = 5 * 60 * 1000;

  const cachedSessions: Record<number, CachedSession> = Object.fromEntries(
    Object.entries(cachedSessionDetails).map(([key, detail]) => [
      key,
      { timestamp: detail.timestamp, ...detail.data },
    ])
  );

  const stats = calculateCacheStats(cachedSessions, CACHE_DURATION_MS);

  return (
    <div className={styles.cacheDebugInfo}>
      <h4>Cache Debug Info</h4>
      <div className={styles.stats}>
        <div>Total Cached: {stats.totalCached}</div>
        <div>Valid: {stats.validCount}</div>
        <div>Expired: {stats.expiredCount}</div>
        <div>Size: {formatCacheSize(stats.cacheSizeBytes)}</div>
      </div>
    </div>
  );
};

export default CacheDebugInfo;
