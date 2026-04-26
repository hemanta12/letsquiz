import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { logout } from '../../../store/slices/authSlice';
import { toggleTheme } from '../../../store/slices/uiSlice';
import styles from './Navbar.module.css';
import Icon from '../../common/Icon';

export const Navbar: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onQuizPage = location.pathname.startsWith('/quiz');
  const onResultPage = location.pathname.startsWith('/result');

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Left Zone: Logo */}
        <span className={styles.logo}>LetsQuiz</span>

        {/* Center Zone: Keep Level 1 navigation focused on gameplay only */}
        <div className={styles.centerLinks}>
          {!onQuizPage && !onResultPage && (
            <Link
              to="/"
              className={`${styles.navLink} ${location.pathname === '/' ? styles.navLinkActive : ''}`}
              aria-label="Play Quiz"
            >
              <span className={styles.navLinkText}>Play Quiz</span>
            </Link>
          )}
        </div>

        {/* Right Zone: Authenticated users can still logout via avatar menu */}
        <div className={styles.rightSection}>
          <button
            className={styles.themeToggle}
            onClick={() => dispatch(toggleTheme())}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size="medium" />
          </button>

          {isAuthenticated && (
            <div className={styles.authenticatedSection} ref={dropdownRef}>
              <button
                className={styles.avatarButton}
                onClick={() => setDropdownOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label="User menu"
              >
                <Icon name="person" size="small" color="inherit" className={styles.avatarIcon} />
              </button>

              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button className={styles.dropdownItemDanger} onClick={handleLogout}>
                    <Icon
                      name="logout"
                      size="small"
                      color="error"
                      className={styles.dropdownIcon}
                    />{' '}
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
