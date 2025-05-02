import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Loading } from '../../components/common';
import DashboardContent from '../../components/Dashboard/DashboardContent';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchUserProfile, fetchLeaderboard } from '../../store/slices/userSlice';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const {
    profile,
    leaderboard,
    loadingProfile,
    loadingLeaderboard,
    errorProfile,
    errorLeaderboard,
  } = useAppSelector((state) => state.user);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch user data when authenticated and component mounts
  useEffect(() => {
    if (isAuthenticated) {
      if (!profile && !loadingProfile && !errorProfile) {
        dispatch(fetchUserProfile(undefined));
      }

      if (leaderboard.length === 0 && !loadingLeaderboard && !errorLeaderboard) {
        dispatch(fetchLeaderboard());
      }
    }
  }, [dispatch, isAuthenticated]);

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
          {errorProfile || errorLeaderboard}
        </Typography>
      </div>
    );
  }

  // Render dashboard content when data is loaded
  if (profile) {
    // Ensure profile is loaded before rendering content that depends on it
    return (
      <div className={styles.dashboard}>
        <Typography variant="h2">Your Quiz Journey</Typography>

        <DashboardContent profile={profile} leaderboard={leaderboard} />
      </div>
    );
  }

  // Fallback or initial state before loading/error
  return (
    <div className={styles.dashboard}>
      <Typography variant="h2">Your Quiz Journey</Typography>
      {/* Optionally display a message or a different loading state */}
    </div>
  );
};

export default Dashboard;
