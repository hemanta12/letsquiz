import React from 'react';
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

const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <MainLayout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </MainLayout>
    </div>
  );
};

export default App;
