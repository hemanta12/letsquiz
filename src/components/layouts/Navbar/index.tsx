import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../common/Icon';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          LetsQuiz
        </Link>

        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <Icon name="menu" />
        </button>

        <div className={`${styles.menuItems} ${isMobileMenuOpen ? styles.isOpen : ''}`}>
          <Link to="/" className={styles.menuItem}>
            Home
          </Link>
          <Link to="/quiz" className={styles.menuItem}>
            Quiz
          </Link>
          <Link to="/login" className={styles.menuItem}>
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
