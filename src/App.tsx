import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from './components/layouts/MainLayout';
import { RouteTransition } from './components/layouts/RouteTransition';
import styles from './App.module.css';

const Home = () => (
  <RouteTransition>
    <div>Home Page</div>
  </RouteTransition>
);
const Quiz = () => (
  <RouteTransition>
    <div>Quiz Page</div>
  </RouteTransition>
);
const Results = () => (
  <RouteTransition>
    <div>Results Page</div>
  </RouteTransition>
);
const NotFound = () => (
  <RouteTransition>
    <div>404 - Not Found</div>
  </RouteTransition>
);

const Login = lazy(() => import('./components/auth/Login'));
const SignUp = lazy(() => import('./components/auth/SignUp'));
const PasswordReset = lazy(() => import('./components/auth/PasswordReset'));

const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <MainLayout>
        <AnimatePresence mode="wait">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/results" element={<Results />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </MainLayout>
    </div>
  );
};

export default App;
