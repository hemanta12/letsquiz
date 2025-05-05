import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layouts/MainLayout';
import { RouteTransition } from './components/layouts/RouteTransition';
import ProtectedRoute from './utils/ProtectedRoute';
import styles from './App.module.css';

const Home = lazy(() => import('./pages/Home'));

const LoadingFallback = () => (
  <RouteTransition>
    <div>Loading...</div>
  </RouteTransition>
);

const ErrorFallback = () => (
  <RouteTransition>
    <div>Error loading page. Please try again.</div>
  </RouteTransition>
);

const Quiz = lazy(() =>
  import('./pages/Quiz').catch(() => ({
    default: () => <ErrorFallback />,
  }))
);

const Results = lazy(() =>
  import('./pages/Results').catch(() => ({
    default: () => <ErrorFallback />,
  }))
);

const NotFound = () => (
  <RouteTransition>
    <div>404 - Not Found</div>
  </RouteTransition>
);

const Login = lazy(() => import('./components/auth/Login'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const PasswordReset = lazy(() => import('./components/auth/PasswordReset'));
const SetNewPassword = lazy(() => import('./components/auth/SetNewPassword'));
const PlayerSetup = lazy(() => import('./pages/PlayerSetup'));
const ChangePassword = lazy(() => import('./components/auth/ChangePassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <MainLayout>
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/player-setup" element={<PlayerSetup />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/results" element={<Results />} />
                <Route path="/change-password" element={<ChangePassword />} />
              </Route>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/set-new-password" element={<SetNewPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </MainLayout>
    </div>
  );
};

export default App;
