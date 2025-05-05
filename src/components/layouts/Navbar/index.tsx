import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { logout } from '../../../store/slices/authSlice';
import styles from './Navbar.module.css';
import Icon from '../../common/Icon';

export const Navbar: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { profile: user } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

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
                className={`${styles.dashboardLink} ${isAuthenticated ? styles.dashboardLinkAuthenticated : ''} ${location.pathname === '/dashboard' ? styles.dashboardLinkActive : ''}`} // Added active class
              >
                Dashboard
              </Link>
              <div className={styles.authenticatedUserGroup}>
                {' '}
                <span className={styles.welcomeMessage}>
                  <Icon
                    name="person"
                    size="small"
                    color="secondary"
                    className={styles.welcomeIcon}
                  />{' '}
                  Welcome, {user?.email || 'User'}!
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
