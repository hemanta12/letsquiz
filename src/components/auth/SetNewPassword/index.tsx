import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, Input, Button, Typography } from '../../common';
import authService from '../../../services/authService';
import styles from './SetNewPassword.module.css';

export const SetNewPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match');
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset token');
      return;
    }
    try {
      await authService.setNewPassword(token, password);
      setStatus('success');
      setMessage('Your password has been reset successfully');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  return (
    <Card className={styles.setNewPasswordCard}>
      <Typography variant="h2" className={styles.title}>
        Set New Password
      </Typography>
      <form onSubmit={handleSetNewPassword} className={styles.form}>
        <Input
          type="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {message && <Typography className={styles[status]}>{message}</Typography>}
        <Button type="submit" variant="primary">
          Set Password
        </Button>
      </form>
      {status === 'success' && (
        <Link to="/login" className={styles.link}>
          Back to Login
        </Link>
      )}
    </Card>
  );
};

export default SetNewPassword;
