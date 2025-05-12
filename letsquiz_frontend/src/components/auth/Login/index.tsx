import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Loading, Modal } from '../../common';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { loginUser, clearGuestSession } from '../../../store/slices/authSlice';
import { fetchUserProfile } from '../../../store/slices/userSlice';
import userService from '../../../services/userService';
import styles from './Login.module.css';

interface MigrationState {
  inProgress: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [migrationState, setMigrationState] = useState<MigrationState>({
    inProgress: false,
    progress: 0,
    currentStep: '',
    error: null,
  });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, isGuest, guestProgress } = useAppSelector(
    (state) => state.auth
  );

  // Monitor migration progress
  useEffect(() => {
    let migrationMonitor: NodeJS.Timeout;
    if (migrationState.inProgress) {
      migrationMonitor = setInterval(() => {
        const progress = userService.getMigrationProgress();
        setMigrationState((prev) => ({
          ...prev,
          progress: (progress.completedSteps / progress.totalSteps) * 100,
          currentStep: progress.currentStep,
          error: progress.error || null,
        }));

        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(migrationMonitor);
          setMigrationState((prev) => ({
            ...prev,
            inProgress: false,
            error: progress.error || null,
          }));

          if (progress.status === 'completed') {
            navigate('/dashboard');
          }
        }
      }, 500);
    }
    return () => {
      if (migrationMonitor) {
        clearInterval(migrationMonitor);
      }
    };
  }, [migrationState.inProgress, navigate]);

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
          guestData: isGuest ? guestProgress : undefined,
        })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        const userId = resultAction.payload.user.id;

        // Start migration if guest data exists
        if (isGuest && guestProgress.quizzes > 0) {
          setMigrationState({
            inProgress: true,
            progress: 0,
            currentStep: 'Initializing migration',
            error: null,
          });

          try {
            await userService.transferGuestData(String(userId));
          } catch (error: any) {
            setMigrationState((prev) => ({
              ...prev,
              error: error.message || 'Migration failed',
            }));
          }
        } else {
          dispatch(clearGuestSession());
          await dispatch(fetchUserProfile(userId.toString()));
          navigate('/dashboard');
        }
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
        {isGuest && guestProgress.quizzes > 0 && (
          <div className={styles.guestInfo}>
            <Typography variant="body1">
              Sign in to save your guest progress: • {guestProgress.quizzes} quizzes completed •{' '}
              {guestProgress.totalScore} points earned
            </Typography>
          </div>
        )}
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
            disabled={loading || migrationState.inProgress}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className={styles.links}>
          <Link to="/reset-password">Forgot Password?</Link>
          <Link to="/signup">Don't have an account? Sign up for free</Link>
        </div>
        <Typography variant="body2" className={styles.note}>
          Registration is completely free and lets you save your progress, access all quiz modes,
          and track your history.
        </Typography>
        {loading && <Loading />}
      </Card>

      {/* Migration Progress Modal */}
      <Modal open={migrationState.inProgress} onClose={() => {}} title="Migrating Your Progress">
        <div className={styles.migrationDialog}>
          <Typography variant="h3">Please wait while we migrate your progress</Typography>
          <Typography variant="body1">{migrationState.currentStep}</Typography>
          <div className={styles.migrationProgress}>
            <div
              className={styles.migrationProgressBar}
              style={{ width: `${migrationState.progress}%` }}
            />
          </div>
          {migrationState.error && (
            <Typography variant="body1" className={styles.error}>
              {migrationState.error}
            </Typography>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Login;
