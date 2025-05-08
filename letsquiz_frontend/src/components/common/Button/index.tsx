import React from 'react';
import styles from './Button.module.css';
import { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  children,
  className,
  ...props
}) => {
  const buttonClassName = `${styles.button} ${styles[variant]} ${styles[size]} ${
    loading ? styles.loading : ''
  } ${className || ''}`.trim();

  return (
    <button disabled={disabled || loading} className={buttonClassName} {...props}>
      {loading ? <span className={styles.spinner} /> : children}
    </button>
  );
};

export default Button;
