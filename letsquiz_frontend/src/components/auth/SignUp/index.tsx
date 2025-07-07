import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Loading } from '../../common';
import styles from './SignUp.module.css';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { signupUser, clearGuestSession } from '../../../store/slices/authSlice';

export const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
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
      data.email !== '' && data.password !== '' && data.confirmPassword !== '';
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

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as visited
    setVisitedFields({
      email: true,
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
      await dispatch(
        signupUser({
          email: formData.email,
          password: formData.password,
        })
      ).unwrap();

      console.log('Signup successful');
      dispatch(clearGuestSession());
      navigate('/login');
    } catch (err: any) {
      console.error('Signup error:', err);

      if (err.code && err.message) {
        setError(err.message);
      } else if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.email) {
          setFieldErrors((prev) => ({
            ...prev,
            email: Array.isArray(errorData.email) ? errorData.email[0] : errorData.email,
          }));
        }
        if (errorData.password) {
          setFieldErrors((prev) => ({
            ...prev,
            password: Array.isArray(errorData.password)
              ? errorData.password[0]
              : errorData.password,
          }));
        }
        if (errorData.detail) {
          setError(errorData.detail);
        } else if (!errorData.email && !errorData.password) {
          setError('An error occurred during signup. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={styles.signupCard}>
        <Typography variant="h2" className={styles.title}>
          Create a Free Account
        </Typography>

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
          <Button type="submit" variant="primary" disabled={loading || !isFormValid}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </form>
        <div className={styles.links}>
          <Link to="/login">
            Already have an account? <u>Login</u> instead
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

export default SignUp;
