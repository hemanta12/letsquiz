import React, { useCallback, useState } from 'react';
import { useActivityTracker } from '../../../hooks/useActivityTracker';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { logout } from '../../../store/slices/authSlice';
import SessionWarningModal from '../../auth/SessionWarningModal';

const SessionManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const [showWarning, setShowWarning] = useState(false);

  const handleInactivityWarning = useCallback(() => {
    if (isAuthenticated && !isGuest) {
      setShowWarning(true);
    }
  }, [isAuthenticated, isGuest]);

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
  const handleContinue = useCallback(() => {
    handleContinueSession();
    resetActivity();
  }, [handleContinueSession, resetActivity]);

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
