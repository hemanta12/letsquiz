import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          LetsQuiz
        </Link>
        <Link to="/login" className={styles.loginLink}>
          Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
