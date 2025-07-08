import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Loading } from '../../components/common';
import DashboardContent from '../../components/Dashboard/DashboardContent';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { logout } from '../../store/slices/authSlice';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const user = useAppSelector((state) => state.user);
  const [profileFetchAttempted, setProfileFetchAttempted] = useState(false);

  const { profile, loadingProfile, loadingLeaderboard, errorProfile, errorLeaderboard } = user;

  const { isAuthenticated, userId } = auth;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated && !profile && !loadingProfile && !profileFetchAttempted) {
      if (!userId) {
        console.warn('[Dashboard useEffect] userId is null, logging out user.');
        dispatch(logout());
        return;
      }
      console.log(
        '[Dashboard useEffect] Conditions met, dispatching fetchUserProfile for userId:',
        userId
      );
      setProfileFetchAttempted(true);
      dispatch(fetchUserProfile(userId.toString()));
    }
  }, [dispatch, isAuthenticated, profile, loadingProfile, profileFetchAttempted, userId]);

  useEffect(() => {
    if (profileFetchAttempted && errorProfile && isAuthenticated && !loadingProfile) {
      console.error(
        '[Dashboard] Failed to fetch user profile, session may be invalid:',
        errorProfile
      );
      if (
        errorProfile.includes('401') ||
        errorProfile.includes('Unauthorized') ||
        errorProfile.includes('authentication')
      ) {
        console.log('[Dashboard] Authentication error detected, logging out user');
        dispatch(logout());
      }
    }
  }, [profileFetchAttempted, errorProfile, isAuthenticated, loadingProfile, dispatch]);

  useEffect(() => {
    if (isAuthenticated && userId && !profile && !loadingProfile && !errorProfile) {
      const timer = setTimeout(() => {
        if (!profile && !loadingProfile) {
          console.warn('[Dashboard] No profile data after timeout, may indicate session issue');
          if (!profileFetchAttempted) {
            setProfileFetchAttempted(true);
            dispatch(fetchUserProfile(userId.toString()));
          } else {
            console.log('[Dashboard] Profile fetch failed after retry, logging out');
            dispatch(logout());
          }
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [
    isAuthenticated,
    userId,
    profile,
    loadingProfile,
    errorProfile,
    profileFetchAttempted,
    dispatch,
  ]);

  // Show loading state
  if (loadingProfile || loadingLeaderboard) {
    return (
      <div className={styles.dashboard}>
        <Loading />
      </div>
    );
  }

  // Show error state
  if (errorProfile || errorLeaderboard) {
    return (
      <div className={styles.dashboard}>
        <Typography variant="body2" color="error" className={styles.error}>
          {errorProfile || errorLeaderboard}{' '}
        </Typography>
      </div>
    );
  }

  if (profile) {
    // Initialize quiz_history if it's undefined
    const safeProfile = {
      ...profile,
      quiz_history: profile.quiz_history || [],
    };

    // Get display name for the dashboard heading
    const displayName =
      (auth.user && !auth.user.isGuest && 'username' in auth.user && auth.user.username) ||
      profile.email?.split('@')[0] ||
      'User';

    const capitalizedDisplayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    return (
      <div className={styles.dashboard}>
        <Typography variant="h2" className={styles.heading}>
          {capitalizedDisplayName}'s Dashboard
        </Typography>
        <DashboardContent profile={safeProfile} />
      </div>
    );
  } else {
    return (
      <div className={styles.dashboard}>
        <Typography variant="h2" className={styles.heading}>
          Your Quiz Journey
        </Typography>
      </div>
    );
  }
};

export default Dashboard;
