import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography } from '../../common';
import authService from '../../../services/authService';
import styles from './SignUp.module.css';

export const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await authService.signup(formData);
      navigate('/login', { state: { message: 'Account created successfully!' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <Card className={styles.signupCard}>
      <Typography variant="h2" className={styles.title}>
        Create Account
      </Typography>
      <form onSubmit={handleSubmit} className={styles.form}>
        <Input
          type="email"
          label="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <Input
          type="password"
          label="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        <Input
          type="password"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
        {error && <Typography className={styles.error}>{error}</Typography>}
        <Button type="submit" variant="primary">
          Sign Up
        </Button>
      </form>
      <Link to="/login" className={styles.link}>
        Already have an account? Login
      </Link>
    </Card>
  );
};

export default SignUp;
