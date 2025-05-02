import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography } from '../../common';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { loginUser } from '../../../store/slices/authSlice';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/dashboard');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Dispatch the loginUser thunk
    dispatch(loginUser({ email, password }));
  };

  return (
    <Card className={styles.loginCard}>
      <Typography variant="h2" className={styles.title}>
        Login to LetsQuiz
      </Typography>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Typography className={styles.error}>{error}</Typography>}{' '}
        <Button type="submit" variant="primary" className={styles.submitButton} disabled={loading}>
          {' '}
          {/* Disable button when loading */}
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <div className={styles.links}>
        <Link to="/reset-password">Forgot Password?</Link>
        <Link to="/signup">Don't have an account? Sign up</Link>
      </div>
    </Card>
  );
};

export default Login;
