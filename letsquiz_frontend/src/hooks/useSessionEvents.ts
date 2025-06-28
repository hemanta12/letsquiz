import { useEffect } from 'react';
import { useAppDispatch } from './reduxHooks';
import { logout } from '../store/slices/authSlice';

interface UseSessionEventsProps {
  onSessionExpired?: () => void;
  onTokenRefreshed?: () => void;
}

/**
 * Hook to handle global session events
 * Useful for components that need to react to session changes
 */
export const useSessionEvents = ({
  onSessionExpired,
  onTokenRefreshed,
}: UseSessionEventsProps = {}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(logout());
      onSessionExpired?.();
    };

    const handleTokenRefreshed = () => {
      onTokenRefreshed?.();
    };

    // Listen for session events dispatched by AuthService
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('tokenRefreshed', handleTokenRefreshed);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('tokenRefreshed', handleTokenRefreshed);
    };
  }, [dispatch, onSessionExpired, onTokenRefreshed]);
};

export default useSessionEvents;
