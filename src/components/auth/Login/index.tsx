import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography } from '../../common';
import { useAppDispatch } from '../../../hooks/reduxHooks';
import { loginStart, loginSuccess, loginFailure } from '../../../store/slices/authSlice';
import authService from '../../../services/authService';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    dispatch(loginStart());

    try {
      const response = await authService.login({ email, password });
      dispatch(loginSuccess(response.user));
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      dispatch(loginFailure(errorMessage));
      setError(errorMessage);
    }
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
        {error && <Typography className={styles.error}>{error}</Typography>}
        <Button type="submit" variant="primary" className={styles.submitButton}>
          Login
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
