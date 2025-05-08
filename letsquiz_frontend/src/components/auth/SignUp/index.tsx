import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Loading } from '../../common';
import authService from '../../../services/authService';
import styles from './SignUp.module.css';

export const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.signup({
        email: formData.email,
        name: formData.name,
        password: formData.password,
      });
      navigate('/login', { state: { message: 'Account created successfully!' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
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
          type="text"
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
        :start_line:70 -------
        {error && <Typography className={styles.error}>{error}</Typography>}
        <Button type="submit" variant="primary" disabled={loading}>
          {' '}
          {/* Disable button when loading */}
          {loading ? 'Signing Up...' : 'Sign Up'}
        </Button>
      </form>
      <Link to="/login" className={styles.link}>
        Already have an account? Login :start_line:77 -------
      </Link>
      {loading && <Loading />}
    </Card>
  );
};

export default SignUp;
