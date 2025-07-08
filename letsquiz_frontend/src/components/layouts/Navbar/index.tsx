import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { logout } from '../../../store/slices/authSlice';
import { toggleTheme } from '../../../store/slices/uiSlice';
import styles from './Navbar.module.css';
import Icon from '../../common/Icon';

export const Navbar: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
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

  // Prefer username, fallback to 'User'
  const displayName =
    (isAuthenticated &&
      user &&
      !user.isGuest &&
      typeof user.username === 'string' &&
      user.username) ||
    'User';

  const onAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const onQuizPage = location.pathname.startsWith('/quiz');
  const onResultPage = location.pathname.startsWith('/result');

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Left Zone: Logo */}
        <span className={styles.logo}>LetsQuiz</span>

        {/* Center Zone: "Play Quiz" and (if authenticated) "Dashboard" */}
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
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className={`${styles.navLink} ${styles.dashboardLink} ${
                location.pathname === '/dashboard' ? styles.navLinkActive : ''
              }`}
              aria-label="Dashboard"
              title="Dashboard"
            >
              <Icon name="dashboard" size="small" className={styles.dashboardIcon} />
              <span className={styles.mobileText}>Dash</span>
              <span className={styles.desktopText}>Dashboard</span>
            </Link>
          )}
        </div>

        {/* Right Zone: Guest => Login/Sign Up, Authenticated => Avatar + Dropdown */}
        <div className={styles.rightSection}>
          <button
            className={styles.themeToggle}
            onClick={() => dispatch(toggleTheme())}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size="medium" />
          </button>

          {!isAuthenticated && !onAuthPage && (
            <>
              <Link
                to="/login"
                onClick={(e) => {
                  if (onQuizPage || onResultPage) e.preventDefault();
                }}
                className={`${styles.loginButton} `}
                title="Login"
                aria-label="Login"
              >
                <span className={styles.loginButtonText}>Login</span>
              </Link>
              <Link
                to="/signup"
                onClick={(e) => {
                  if (onQuizPage || onResultPage) e.preventDefault();
                }}
                className={`${styles.signupButton} ${styles.hideOnMobile}`}
                title="SignUp"
                aria-label="SignUp"
              >
                <span className={styles.desktopText}>Sign Up</span>
              </Link>
            </>
          )}

          {isAuthenticated && (
            <div className={styles.authenticatedSection} ref={dropdownRef}>
              <span className={styles.greeting}>Hi, {displayName}</span>
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
                  <Link to="/profile" className={styles.dropdownItem}>
                    <Icon
                      name="person"
                      size="small"
                      color="secondary"
                      className={styles.dropdownIcon}
                    />{' '}
                    Profile
                  </Link>

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
