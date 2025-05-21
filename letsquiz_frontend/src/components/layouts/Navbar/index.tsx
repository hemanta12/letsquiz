import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { logout, AuthState } from '../../../store/slices/authSlice';
import styles from './Navbar.module.css';
import Icon from '../../common/Icon';

export const Navbar: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  // Prefer username, fallback to 'User'
  const displayName =
    (isAuthenticated &&
      user &&
      !user.isGuest &&
      typeof user.username === 'string' &&
      user.username) ||
    'User';

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <Icon name="group" size="medium" color="inherit" className={styles.logoIcon} /> LetsQuiz
        </Link>
        <div className={styles.authSection}>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`${styles.dashboardLink} ${isAuthenticated ? styles.dashboardLinkAuthenticated : ''} ${location.pathname === '/dashboard' ? styles.dashboardLinkActive : ''}`}
              >
                Dashboard
              </Link>
              <div className={styles.authenticatedUserGroup}>
                <span className={styles.welcomeMessage}>
                  <Icon
                    name="person"
                    size="small"
                    color="secondary"
                    className={styles.welcomeIcon}
                  />
                  Welcome, <span>{displayName}</span>
                </span>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className={styles.loginLink}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
