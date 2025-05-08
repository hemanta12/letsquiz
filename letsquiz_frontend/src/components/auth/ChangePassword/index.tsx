import React, { useState } from 'react';
import { Card, Input, Button, Typography } from '../../common';
import authService from '../../../services/authService';
import styles from './ChangePassword.module.css';

export const ChangePassword: React.FC = () => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    try {
      // Assuming authService has a changePassword method
      // This will need to be implemented in authService.ts
      // await authService.changePassword(formData.currentPassword, formData.newPassword);
      setSuccess('Password changed successfully!');
      setError('');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setSuccess('');
    }
  };

  return (
    <Card className={styles.changePasswordCard}>
      <Typography variant="h2" className={styles.title}>
        Change Password
      </Typography>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="password"
          label="Current Password"
          value={formData.currentPassword}
          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          required
        />
        <Input
          type="password"
          label="New Password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          required
        />
        <Input
          type="password"
          label="Confirm New Password"
          value={formData.confirmNewPassword}
          onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
          required
        />
        {error && <Typography className={styles.error}>{error}</Typography>}
        {success && <Typography className={styles.success}>{success}</Typography>}
        <Button type="submit" variant="primary">
          Change Password
        </Button>
      </form>
    </Card>
  );
};

export default ChangePassword;
