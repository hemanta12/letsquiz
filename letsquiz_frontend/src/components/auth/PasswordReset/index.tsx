import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Input, Button, Typography } from '../../common';
import authService from '../../../services/authService';
import styles from './PasswordReset.module.css';

export const PasswordReset: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authService.resetPassword(email);
      setStatus('success');
      setMessage('Password reset instructions sent to your email');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  return (
    <Card className={styles.resetCard}>
      <Typography variant="h2" className={styles.title}>
        Reset Password
      </Typography>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {message && <Typography className={styles[status]}>{message}</Typography>}
        <Button type="submit" variant="primary">
          Send Reset Link
        </Button>
      </form>
      <Link to="/login" className={styles.link}>
        Back to Login
      </Link>
    </Card>
  );
};

export default PasswordReset;
