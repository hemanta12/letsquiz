import React, { useCallback, useState, useEffect } from 'react';
import { useActivityTracker } from '../../../hooks/useActivityTracker';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { logout, refreshToken } from '../../../store/slices/authSlice';
import SessionWarningModal from '../../auth/SessionWarningModal';

const SessionManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest, tokenExpiresAt } = useAppSelector((state) => state.auth);
  const [showWarning, setShowWarning] = useState(false);

  const handleInactivityWarning = useCallback(async () => {
    if (isAuthenticated && !isGuest) {
      setShowWarning(true);

      // Also check if token needs refreshing when warning appears
      if (tokenExpiresAt && tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
        try {
          await dispatch(refreshToken()).unwrap();
        } catch (error) {
          // If refresh fails, the warning will still show but user will likely be logged out
        }
      }
    }
  }, [isAuthenticated, isGuest, tokenExpiresAt, dispatch]);

  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    // The logout is already handled by the activity tracker
  }, []);

  const handleContinueSession = useCallback(() => {
    setShowWarning(false);
    // The resetActivity will be called automatically when user interacts
  }, []);

  const handleLogoutNow = useCallback(() => {
    setShowWarning(false);
    dispatch(logout());
  }, [dispatch]);

  const { resetActivity } = useActivityTracker({
    onInactivityWarning: handleInactivityWarning,
    onSessionExpired: handleSessionExpired,
    inactivityTimeout: 15 * 60 * 1000, // 15 minutes
    warningTime: 2 * 60 * 1000, // 2 minutes warning
  });

  // Handle the continue session click
  const handleContinue = useCallback(async () => {
    handleContinueSession();
    resetActivity();

    // If token is expiring in less than 5 minutes, refresh it
    if (tokenExpiresAt && tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
      try {
        await dispatch(refreshToken()).unwrap();
      } catch (error) {
        // If token refresh fails, the user will be logged out automatically
        // by the auth service, so we just close the modal
        setShowWarning(false);
      }
    }
  }, [handleContinueSession, resetActivity, tokenExpiresAt, dispatch]);

  useEffect(() => {
    const handleSessionExpiredEvent = (event: CustomEvent) => {
      setShowWarning(false);
      dispatch(logout());
    };

    const handleAuthenticationError = (event: CustomEvent) => {
      setShowWarning(false);
      dispatch(logout());
    };

    window.addEventListener('sessionExpired', handleSessionExpiredEvent as EventListener);
    window.addEventListener('authenticationError', handleAuthenticationError as EventListener);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpiredEvent as EventListener);
      window.removeEventListener('authenticationError', handleAuthenticationError as EventListener);
    };
  }, [dispatch]);

  // Only render for authenticated non-guest users
  if (!isAuthenticated || isGuest) {
    return null;
  }

  return (
    <SessionWarningModal
      isOpen={showWarning}
      onContinue={handleContinue}
      onLogout={handleLogoutNow}
      timeRemaining={60} // a minutes in seconds
    />
  );
};

export default SessionManager;
