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
  const { auth, user } = useAppSelector((state) => ({
    auth: state.auth,
    user: state.user,
  }));

  const { profile, loadingProfile, loadingLeaderboard, errorProfile, errorLeaderboard } = user;

  const { isAuthenticated } = auth;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (isAuthenticated && !profile && !loadingProfile) {
      const userId = auth.user?.id;
      if (userId) {
        dispatch(fetchUserProfile(userId));
      }
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
      return (
        <div className={styles.dashboard}>
          <Typography variant="h2">Your Quiz Journey</Typography>

          <DashboardContent profile={profile} />
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
