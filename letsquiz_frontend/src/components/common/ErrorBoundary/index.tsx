import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Typography } from '../Typography';
import { Button } from '../Button';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback
      ) : (
        <div className={styles.errorContainer}>
          <Typography variant="h2" color="error">
            Something went wrong
          </Typography>
          <Typography variant="body1" className={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button variant="primary" onClick={this.handleReset} className={styles.resetButton}>
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
