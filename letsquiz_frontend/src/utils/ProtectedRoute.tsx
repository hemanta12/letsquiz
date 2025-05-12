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

  // Redirect to login if authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Store the attempted URL for redirect after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated || (guestAllowed && isGuestSession) || (!requireAuth && !guestAllowed)) {
    return children ? children : <Outlet />;
  }

  // If guest session is required but not present, redirect to home
  if (guestAllowed && !isGuestSession && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Default fallback to login
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
