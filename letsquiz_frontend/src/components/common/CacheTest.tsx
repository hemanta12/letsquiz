import React, { useState } from 'react';
import { useSessionCache } from '../../hooks/useSessionCache';
import { useAppSelector } from '../../hooks/reduxHooks';
import CacheDebugInfo from '../common/CacheDebugInfo';
import Button from '../common/Button';
import styles from './CacheTest.module.css';

/**
 * Test component to demonstrate caching functionality
 * Shows cache hits/misses and performance improvements
 */
const CacheTest: React.FC = () => {
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [fetchCount, setFetchCount] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(1);

  const { fetchSession, isCached, getCachedSession, clearCache, cleanExpired } = useSessionCache();
  const { sessions } = useAppSelector((state) => state.quiz);

  const handleFetchSession = async () => {
    const startTime = Date.now();

    if (isCached(selectedSessionId)) {
      // Get from cache
      const cachedData = getCachedSession(selectedSessionId);
      const endTime = Date.now();
      setLastFetchTime(endTime - startTime);
      console.log('Cache HIT - Retrieved in', endTime - startTime, 'ms', cachedData);
    } else {
      // Fetch from API
      const sessionData = await fetchSession(selectedSessionId);
      const endTime = Date.now();
      setLastFetchTime(endTime - startTime);
      setFetchCount((prev) => prev + 1);
      console.log('Cache MISS - Fetched in', endTime - startTime, 'ms', sessionData);
    }
  };

  const availableSessionIds = sessions?.slice(0, 5).map((s) => s.id) || [1, 2, 3, 4, 5];

  return (
    <div className={styles.cacheTest}>
      <h3>Cache Performance Test</h3>

      <div className={styles.controls}>
        <div className={styles.sessionSelect}>
          <label>Session ID:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(Number(e.target.value))}
          >
            {availableSessionIds.map((id) => (
              <option key={id} value={id}>
                Session {id}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <Button onClick={handleFetchSession}>
            {isCached(selectedSessionId) ? 'Get from Cache' : 'Fetch from API'}
          </Button>
          <Button onClick={clearCache} variant="secondary">
            Clear Cache
          </Button>
          <Button onClick={cleanExpired} variant="secondary">
            Clean Expired
          </Button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <strong>Cache Status:</strong>
          <span className={isCached(selectedSessionId) ? styles.cached : styles.notCached}>
            {isCached(selectedSessionId) ? 'CACHED' : 'NOT CACHED'}
          </span>
        </div>
        <div className={styles.statItem}>
          <strong>API Calls Made:</strong> {fetchCount}
        </div>
        <div className={styles.statItem}>
          <strong>Last Fetch Time:</strong>
          {lastFetchTime !== null ? `${lastFetchTime}ms` : 'N/A'}
        </div>
      </div>

      <div className={styles.instructions}>
        <h4>Test Instructions:</h4>
        <ol>
          <li>Click "Fetch from API" - should be slow (network call)</li>
          <li>Click "Get from Cache" immediately - should be instant</li>
          <li>Wait 5+ minutes and click again - should fetch from API again</li>
          <li>Try different session IDs to see individual caching</li>
        </ol>
      </div>

      <CacheDebugInfo enabled={true} />
    </div>
  );
};

export default CacheTest;
