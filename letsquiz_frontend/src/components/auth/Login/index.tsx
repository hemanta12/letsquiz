import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Loading } from '../../common';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { loginUser, clearGuestSession } from '../../../store/slices/authSlice';
import { fetchUserProfile } from '../../../store/slices/userSlice';
import styles from './Login.module.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, isGuest } = useAppSelector((state) => state.auth);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Log error state changes
  useEffect(() => {
    console.log('Authentication Error State:', error);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const resultAction = await dispatch(
        loginUser({
          email: email,
          password: password,
        })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        const userId = resultAction.payload.user.id;

        if (isGuest) {
          dispatch(clearGuestSession());
        }
        await dispatch(fetchUserProfile(userId.toString()));
        navigate('/dashboard');
      }
    } catch (error) {
      // Error handling is managed by the auth slice
    }
  };

  return (
    <>
      <Card className={styles.loginCard}>
        <Typography variant="h2" className={styles.title}>
          Sign in to LetsQuiz
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
          {error && (
            <Typography
              className={`${styles.error} ${
                error.code === 'authentication_failed' || error.code === 'invalid_credentials'
                  ? styles.authentication
                  : error.code === 'validation_error' || error.code === 'missing_fields'
                    ? styles.validation
                    : styles.system
              }`}
            >
              {error.message && error.message !== 'An unexpected error occurred'
                ? error.message
                : error.code === 'authentication_failed'
                  ? 'Login failed. Please try again.'
                  : error.code === 'invalid_credentials'
                    ? 'The email or password you entered is incorrect.'
                    : error.code === 'missing_fields'
                      ? 'Please fill in all required fields.'
                      : error.code === 'validation_error'
                        ? 'Please check your input and try again.'
                        : error.code === 'server_error'
                          ? 'Unable to log in at the moment. Please try again later.'
                          : 'An unexpected error occurred'}
            </Typography>
          )}
          <Button
            type="submit"
            variant="primary"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className={styles.links}>
          <Link to="/signup">
            Don't have an account? <u>Sign up</u> for free
          </Link>
        </div>
        <Typography variant="body2" className={styles.note}>
          Users with an account can access their quiz history and see their performance dashboard.
        </Typography>
        {loading && <Loading />}
      </Card>
    </>
  );
};

export default Login;
