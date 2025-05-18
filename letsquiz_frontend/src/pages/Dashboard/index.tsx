import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Loading } from '../../components/common';
import DashboardContent from '../../components/Dashboard/DashboardContent';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchUserProfile } from '../../store/slices/userSlice';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const user = useAppSelector((state) => state.user);

  const { profile, loadingProfile, loadingLeaderboard, errorProfile, errorLeaderboard } = user;

  const { isAuthenticated } = auth;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (isAuthenticated && !profile && !loadingProfile) {
      const userId = auth.userId;
      if (!userId) {
        console.warn('[Dashboard useEffect] userId is null, cannot fetch profile.');
        return;
      }
      console.log(
        '[Dashboard useEffect] Conditions met, dispatching fetchUserProfile for userId:',
        userId
      );
      dispatch(fetchUserProfile(userId.toString()));
    }
  }, [dispatch, isAuthenticated, profile, loadingProfile, auth]);

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

  if (!loadingProfile && !loadingLeaderboard && !errorProfile && !errorLeaderboard) {
    if (profile) {
      // Initialize quiz_history if it's undefined
      const safeProfile = {
        ...profile,
        quiz_history: profile.quiz_history || [],
      };

      return (
        <div className={styles.dashboard}>
          <Typography variant="h2">Your Quiz Journey</Typography>
          <DashboardContent profile={safeProfile} />
        </div>
      );
    } else {
      return (
        <div className={styles.dashboard}>
          <Typography variant="h2">Your Quiz Journey</Typography>
        </div>
      );
    }
  }

  return (
    <div className={styles.dashboard}>
      <Typography variant="h2">Your Quiz Journey</Typography>
    </div>
  );
};

export default Dashboard;
