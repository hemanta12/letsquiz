import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import {
  fetchSingleDetailedQuizSession,
  clearSessionCache,
  invalidateSessionCache,
  cleanExpiredCache,
} from '../store/slices/userSlice';
import { SessionDetail } from '../types/dashboard.types';

export interface UseSessionCacheReturn {
  fetchSession: (sessionId: number) => Promise<SessionDetail | null>;
  isCached: (sessionId: number) => boolean;
  getCachedSession: (sessionId: number) => SessionDetail | null;
  clearCache: () => void;
  invalidateSession: (sessionId: number) => void;
  cleanExpired: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing quiz session caching
 * Provides efficient session data fetching with automatic caching
 */
export const useSessionCache = (): UseSessionCacheReturn => {
  const dispatch = useAppDispatch();
  const { loadingSelectedDetailedSession, errorSelectedDetailedSession, cachedSessionDetails } =
    useAppSelector((state) => state.user);

  const fetchSession = useCallback(
    async (sessionId: number): Promise<SessionDetail | null> => {
      try {
        const result = await dispatch(fetchSingleDetailedQuizSession(sessionId));
        if (fetchSingleDetailedQuizSession.fulfilled.match(result)) {
          return result.payload;
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch session:', error);
        return null;
      }
    },
    [dispatch]
  );

  const isCached = useCallback(
    (sessionId: number): boolean => {
      const cachedSession = cachedSessionDetails[sessionId];
      if (!cachedSession) return false;

      const now = Date.now();
      const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
      return now - cachedSession.timestamp < CACHE_DURATION_MS;
    },
    [cachedSessionDetails]
  );

  const getCachedSession = useCallback(
    (sessionId: number): SessionDetail | null => {
      const cachedSession = cachedSessionDetails[sessionId];
      if (!cachedSession) return null;

      const now = Date.now();
      const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
      if (now - cachedSession.timestamp >= CACHE_DURATION_MS) return null;

      return cachedSession.data;
    },
    [cachedSessionDetails]
  );

  const clearCache = useCallback(() => {
    dispatch(clearSessionCache());
  }, [dispatch]);

  const invalidateSession = useCallback(
    (sessionId: number) => {
      dispatch(invalidateSessionCache(sessionId));
    },
    [dispatch]
  );

  const cleanExpired = useCallback(() => {
    dispatch(cleanExpiredCache());
  }, [dispatch]);

  return {
    fetchSession,
    isCached,
    getCachedSession,
    clearCache,
    invalidateSession,
    cleanExpired,
    isLoading: loadingSelectedDetailedSession,
    error: errorSelectedDetailedSession,
  };
};
