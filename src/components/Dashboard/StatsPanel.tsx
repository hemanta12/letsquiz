import React from 'react';
import { Typography, Card } from '../common';
import { QuizSessionHistory, CategoryStats, UserProfile } from '../../types/api.types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  profile: UserProfile;
  stats: CategoryStats[];
  sessions: QuizSessionHistory[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ profile, stats, sessions }) => {
  const totalQuizzes = sessions.length;
  const totalScoreSum = sessions.reduce(
    (acc, session) => acc + (session.score !== null ? session.score : 0),
    0
  ); // Handle null score
  const averageScore =
    totalQuizzes > 0 ? Math.round((totalScoreSum / (totalQuizzes * 10)) * 100) : 0;

  // Find the best category based on average score
  const bestCategory = stats.reduce((best, curr) => {
    const currAvg =
      curr.totalQuizzes > 0
        ? (curr.totalScore !== null ? curr.totalScore : 0) / curr.totalQuizzes
        : 0;
    const bestAvg =
      best.totalQuizzes > 0
        ? (best.totalScore !== null ? best.totalScore : 0) / best.totalQuizzes
        : 0;
    return currAvg > bestAvg ? curr : best;
  }, stats[0])?.category;

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
