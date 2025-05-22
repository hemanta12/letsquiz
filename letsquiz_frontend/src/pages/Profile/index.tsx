import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchUserProfile } from '../../store/slices/userSlice';
import { Typography, Card, Loading } from '../../components/common';
import styles from './Profile.module.css';

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const { userId, user } = useAppSelector((state) => state.auth);
  // Extract username string for display
  const username =
    typeof user === 'string'
      ? user
      : user && typeof user === 'object' && 'username' in user
        ? user.username
        : '';

  const { profile, loadingProfile, errorProfile } = useAppSelector((state) => state.user);

  useEffect(() => {
    if (userId && !profile && !loadingProfile) {
      dispatch(fetchUserProfile(userId.toString()));
    }
  }, [dispatch, userId, profile, loadingProfile]);

  if (loadingProfile) {
    return <Loading />;
  }

  if (errorProfile) {
    return (
      <Card className={styles.profileCard}>
        <Typography variant="h2" className={styles.title}>
          Profile
        </Typography>
        <Typography className={styles.error}>{errorProfile}</Typography>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <Card className={styles.profileCard}>
      <Typography variant="h2" className={styles.title}>
        Profile
      </Typography>
      <div className={styles.infoRow}>
        <Typography variant="body1">
          <b>User Name:</b> {username || profile.email}
        </Typography>
      </div>
      <div className={styles.infoRow}>
        <Typography variant="body1">
          <b>Email:</b> {profile.email}
        </Typography>
      </div>
      <div className={styles.infoRow}>
        <Typography variant="body1">
          <b>Account Created:</b>{' '}
          {profile.date_joined
            ? new Date(profile.date_joined).toLocaleDateString()
            : 'Not available'}
        </Typography>
      </div>
      <div className={styles.changePasswordRow}>
        {/* Placeholder for change password button */}
        <Typography
          variant="body2"
          color="secondary"
          tabIndex={0}
          aria-label="Change Password (coming soon)"
        >
          Change Password (coming soon)
        </Typography>
      </div>
    </Card>
  );
};

export default Profile;
