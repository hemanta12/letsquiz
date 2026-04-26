import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { RootState } from '../store/store';

interface ProtectedRouteProps {
  children?: React.ReactElement;
  requireAuth?: boolean;
  guestAllowed?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  guestAllowed = false,
}) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isGuestSession = localStorage.getItem('guestUser') !== null;

  // Level 1 uses public gameplay routing, so auth-required redirects go home for now.
  if (requireAuth && !isAuthenticated) {
    // Keep redirect intent for future levels where auth routes are restored.
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated || (guestAllowed && isGuestSession) || (!requireAuth && !guestAllowed)) {
    return children ? children : <Outlet />;
  }

  // If guest session is required but not present, redirect to home
  if (guestAllowed && !isGuestSession && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Default fallback to home for Level 1.
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
