import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../../components/common';
import DashboardContent from '../../components/Dashboard/DashboardContent';
import { dummySessions } from '../../data/dummyData';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const isSignedIn = true; // Replace with real auth check
  const [sessions] = useState(dummySessions);

  useEffect(() => {
    if (!isSignedIn) {
      navigate('/login');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className={styles.dashboard}>
      <Typography variant="h2">Your Quiz Journey</Typography>
      <DashboardContent sessions={sessions} />
    </div>
  );
};

export default Dashboard;
