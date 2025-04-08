import React from 'react';
import styles from './Loading.module.css';
import { LoadingProps } from './types';

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'medium',
  color = 'primary',
  className,
  ...props
}) => {
  const loadingClassName = `
    ${styles.loading} 
    ${styles[variant]} 
    ${styles[size]} 
    ${styles[color]} 
    ${className || ''}
  `.trim();

  return variant === 'spinner' ? (
    <div className={loadingClassName} {...props} />
  ) : (
    <div className={styles.skeleton} {...props}>
      <div className={loadingClassName} />
    </div>
  );
};

export default Loading;
