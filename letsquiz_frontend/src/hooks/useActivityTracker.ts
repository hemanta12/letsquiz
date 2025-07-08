import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { logout } from '../store/slices/authSlice';

interface UseActivityTrackerProps {
  onInactivityWarning?: () => void;
  onSessionExpired?: () => void;
  inactivityTimeout?: number; // in milliseconds
  warningTime?: number; // in milliseconds
}

interface UseActivityTrackerReturn {
  resetActivity: () => void;
  isInactive: boolean;
  timeUntilWarning: number;
  timeUntilExpiry: number;
}

export const useActivityTracker = ({
  onInactivityWarning,
  onSessionExpired,
  inactivityTimeout = 15 * 60 * 1000, // 15 minutes
  warningTime = 2 * 1 * 1000, // 2 minutes warning
}: UseActivityTrackerProps = {}): UseActivityTrackerReturn => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest } = useAppSelector((state) => state.auth);

  const lastActivityRef = useRef<number>(Date.now());
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expiredTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInactiveRef = useRef<boolean>(false);
  const timeUntilWarningRef = useRef<number>(inactivityTimeout - warningTime);
  const timeUntilExpiryRef = useRef<number>(inactivityTimeout);

  const clearTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (expiredTimeoutRef.current) {
      clearTimeout(expiredTimeoutRef.current);
      expiredTimeoutRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  const resetActivity = useCallback(() => {
    if (!isAuthenticated || isGuest) return;

    lastActivityRef.current = Date.now();
    isInactiveRef.current = false;

    // Clear existing timeouts
    clearTimeouts();

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && !isGuest) {
        console.log('[ActivityTracker] Inactivity warning triggered');
        isInactiveRef.current = true;
        onInactivityWarning?.();

        // Set expiry timeout after warning
        expiredTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated && !isGuest) {
            console.log('[ActivityTracker] Session expired due to inactivity');
            dispatch(logout());
            onSessionExpired?.();
          }
        }, warningTime);
      }
    }, inactivityTimeout - warningTime);
  }, [
    isAuthenticated,
    isGuest,
    inactivityTimeout,
    warningTime,
    onInactivityWarning,
    onSessionExpired,
    dispatch,
    clearTimeouts,
  ]);

  const handleActivity = useCallback(() => {
    if (!isAuthenticated || isGuest) return;

    resetActivity();
  }, [resetActivity, isAuthenticated, isGuest]);

  // Update time counters
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;

    const updateTimeCounters = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      timeUntilWarningRef.current = Math.max(
        0,
        inactivityTimeout - warningTime - timeSinceActivity
      );
      timeUntilExpiryRef.current = Math.max(0, inactivityTimeout - timeSinceActivity);
    };

    checkIntervalRef.current = setInterval(updateTimeCounters, 1000);
    updateTimeCounters();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, isGuest, inactivityTimeout, warningTime]);

  // Set up activity event listeners
  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      clearTimeouts();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize activity timer
    resetActivity();

    return () => {
      // Remove event listeners
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimeouts();
    };
  }, [isAuthenticated, isGuest, handleActivity, resetActivity, clearTimeouts]);

  return {
    resetActivity,
    isInactive: isInactiveRef.current,
    timeUntilWarning: timeUntilWarningRef.current,
    timeUntilExpiry: timeUntilExpiryRef.current,
  };
};
