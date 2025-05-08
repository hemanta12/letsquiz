import React from 'react';
import styles from './Card.module.css';
import { CardProps } from './types';

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  interactive = false,
  loading = false,
  className,
  ...props
}) => {
  const cardClassName = `
    ${styles.card} 
    ${styles[variant]}
    ${interactive ? styles.interactive : ''} 
    ${loading ? styles.loading : ''} 
    ${className || ''}
  `.trim();

  return (
    <div className={cardClassName} {...props}>
      {loading ? <div className={styles.skeleton} aria-hidden="true" /> : children}
    </div>
  );
};

export default Card;
