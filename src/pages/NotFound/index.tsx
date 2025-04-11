import React from 'react';
import styles from './NotFound.module.css';

export const NotFound = () => {
  return (
    <div className={styles.notFound}>
      <h1>404</h1>
      <p>Page Not Found</p>
    </div>
  );
};

export default NotFound;
