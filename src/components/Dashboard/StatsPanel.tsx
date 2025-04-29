import React from 'react';
import { Typography, Card } from '../common';
import { QuizSession, CategoryStats } from '../../types/dashboard.types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  stats: CategoryStats[];
  sessions: QuizSession[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, sessions }) => {
  const totalQuizzes = sessions.length;
  const averageScore = Math.round(
    (sessions.reduce((acc, session) => acc + session.score, 0) / (sessions.length * 10)) * 100
  );
  const bestCategory = stats.reduce(
    (best, curr) =>
      curr.totalScore / curr.totalQuizzes > best.totalScore / best.totalQuizzes ? curr : best,
    stats[0]
  )?.category;

  return (
    <div className={styles.statsRow}>
      <Card className={styles.statCard}>
        <Typography variant="h1">Overall Stats</Typography>
        <div className={styles.stats}>
          <div>
            <Typography variant="body2">Total Quizzes</Typography>
            <div className={styles.statValue}>{totalQuizzes}</div>
          </div>
          <div>
            <Typography variant="body2">Average Score</Typography>
            <div className={styles.statValue}>{averageScore}%</div>
          </div>
          <div>
            <Typography variant="body2">Best Category</Typography>
            <div className={styles.statValue}>{bestCategory || 'N/A'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsPanel;
