import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Using CSS Modules for component styling
import styles from './App.module.css';

// Temporary placeholder components until we build the real ones
const Home = () => <div>Home Page</div>;
const Quiz = () => <div>Quiz Page</div>;
const Results = () => <div>Results Page</div>;
const NotFound = () => <div>404 - Not Found</div>;

const App: React.FC = () => {
  return (
    <div className={styles.appContainer}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/results" element={<Results />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

export default App;
