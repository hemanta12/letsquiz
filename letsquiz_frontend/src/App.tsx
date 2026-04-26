import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layouts/MainLayout';
import { RouteTransition } from './components/layouts/RouteTransition';
import ProtectedRoute from './utils/ProtectedRoute';
import styles from './App.module.css';
import { QuizStateHandler } from './components/Quiz/QuizHooks';
import SessionManager from './components/common/SessionManager';

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

const PlayerSetup = lazy(() => import('./pages/PlayerSetup'));

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
