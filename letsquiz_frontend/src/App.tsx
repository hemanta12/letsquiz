import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layouts/MainLayout';
import { RouteTransition } from './components/layouts/RouteTransition';
import ProtectedRoute from './utils/ProtectedRoute';
import styles from './App.module.css';
import { QuizStateHandler } from './components/Quiz/QuizStateHandler';
import SessionManager from './components/common/SessionManager';

const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));

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
const PlayerSetup = lazy(() => import('./pages/PlayerSetup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <MainLayout>
        <QuizStateHandler />
        <SessionManager />
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes - No auth required */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Auth Required Routes - Only logged in users */}
              <Route element={<ProtectedRoute requireAuth={true} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Mixed Access Routes - Both guest and auth users */}
              <Route element={<ProtectedRoute guestAllowed={true} />}>
                <Route path="/player-setup" element={<PlayerSetup />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/results" element={<Results />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </MainLayout>
    </div>
  );
};

export default App;
