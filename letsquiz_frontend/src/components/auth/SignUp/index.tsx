import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Loading, Modal } from '../../common';
import userService from '../../../services/userService';
import styles from './SignUp.module.css';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { signupUser, clearGuestSession } from '../../../store/slices/authSlice';

interface MigrationState {
  inProgress: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

export const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [visitedFields, setVisitedFields] = useState({
    email: false,
    name: false,
    password: false,
    confirmPassword: false,
  });

  const [error, setError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  // Check if all fields are valid and visited
  const checkFormValidity = (
    data: typeof formData,
    errors: typeof fieldErrors,
    visited: typeof visitedFields
  ) => {
    const allFieldsVisited = Object.values(visited).every((v) => v);
    const allFieldsFilled =
      data.email !== '' && data.name !== '' && data.password !== '' && data.confirmPassword !== '';
    const noErrors = Object.values(errors).every((error) => error === '');

    return allFieldsVisited && allFieldsFilled && noErrors;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email (e.g., john@example.com)';
    }
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 4) {
      return 'Password must be at least 4 characters long';
    }
    return '';
  };

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleBlur = (field: keyof typeof formData) => {
    let errorMessage = '';

    switch (field) {
      case 'email':
        errorMessage = validateEmail(formData.email);
        break;
      case 'password':
        errorMessage = validatePassword(formData.password);
        // Also validate confirm password when password field is blurred
        if (visitedFields.confirmPassword && formData.confirmPassword) {
          const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
          setFieldErrors((prev) => ({
            ...prev,
            confirmPassword: confirmError,
          }));
        }
        break;
      case 'confirmPassword':
        errorMessage = validateConfirmPassword(formData.password, formData.confirmPassword);
        break;
    }

    // Mark field as visited
    setVisitedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    const newErrors = {
      ...fieldErrors,
      [field]: errorMessage,
    };

    setFieldErrors(newErrors);
    setIsFormValid(
      checkFormValidity(formData, newErrors, {
        ...visitedFields,
        [field]: true,
      })
    );
  };

  // Only update form data on field changes, no validation
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };
  const [loading, setLoading] = useState(false);
  const [migrationState, setMigrationState] = useState<MigrationState>({
    inProgress: false,
    progress: 0,
    currentStep: '',
    error: null,
  });

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    loading: authLoading,
    error: authError,
    isGuest,
    guestProgress,
    user,
  } = useAppSelector((state) => state.auth);

  // Monitor migration progress
  useEffect(() => {
    let migrationMonitor: NodeJS.Timeout;
    if (migrationState.inProgress && user && !isGuest) {
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
  }, [migrationState.inProgress, user, isGuest, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as visited
    setVisitedFields({
      email: true,
      name: true,
      password: true,
      confirmPassword: true,
    });

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.password,
      formData.confirmPassword
    );

    const newErrors = {
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setFieldErrors(newErrors);
    setIsFormValid(
      checkFormValidity(formData, newErrors, {
        email: true,
        name: true,
        password: true,
        confirmPassword: true,
      })
    );

    if (emailError || passwordError || confirmPasswordError) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Signup
      await dispatch(
        signupUser({
          email: formData.email,
          username: formData.name,
          password: formData.password,
        })
      ).unwrap();

      console.log('Signup successful');

      // Clear any guest session
      dispatch(clearGuestSession());

      // Redirect to login page
      navigate('/login');
    } catch (err: any) {
      let errorMessage = 'An error occurred';
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.username && Array.isArray(errorData.username)) {
          errorMessage = `Username error: ${errorData.username.join(', ')}`;
        } else if (errorData.email && Array.isArray(errorData.email)) {
          errorMessage = `Email error: ${errorData.email.join(', ')}`;
        } else if (errorData.detail) {
          errorMessage = `Error: ${errorData.detail}`;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={styles.signupCard}>
        <Typography variant="h2" className={styles.title}>
          Create Free Account
        </Typography>
        <Typography variant="body1" className={styles.subtitle}>
          Sign up to save your progress, access all quiz modes, and track your history.
        </Typography>
        {isGuest && guestProgress.quizzes > 0 && (
          <div className={styles.guestInfo}>
            <Typography variant="body1">
              Your guest progress will be saved: • {guestProgress.quizzes} quizzes completed •{' '}
              {guestProgress.totalScore} points earned
            </Typography>
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            error={fieldErrors.email}
            required
          />
          <Input
            type="text"
            label="Name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            required
          />
          <Input
            type="password"
            label="Password"
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            error={fieldErrors.password}
            required
          />
          <Input
            type="password"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            error={fieldErrors.confirmPassword}
            required
          />

          {error && <Typography className={styles.error}>{error}</Typography>}
          <Button
            type="submit"
            variant="primary"
            disabled={loading || migrationState.inProgress || !isFormValid}
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>
        <div className={styles.links}>
          <Link to="/login">Already have an account? Login</Link>
        </div>
        <Typography variant="body2" className={styles.note}>
          Registration is completely free. No credit card required.
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

export default SignUp;
