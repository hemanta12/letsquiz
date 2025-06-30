import React from 'react';
import { Typography, Card } from '../common';
import { UserProfile, QuizSessionHistory, CategoryStats } from '../../types/api.types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  profile: UserProfile;
  sessions: QuizSessionHistory[];
  categoryStats: CategoryStats[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ profile, sessions, categoryStats }) => {
  const soloSessions = sessions.filter((s) => !s.is_group_session);
  const totalQuizzes = soloSessions.length;
  const averageScore =
    soloSessions.length > 0
      ? Math.round(
          (soloSessions.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            soloSessions.reduce((acc, s) => acc + (s.total_questions ?? 0), 0)) *
            100
        )
      : 0;

  // Calculate best category from passed categoryStats
  let bestCategoryDisplay = 'N/A';
  if (categoryStats.length > 0) {
    // Find category with highest average score
    const bestCategory = categoryStats.reduce((prev, current) => {
      const prevAvg = prev.totalQuizzes > 0 ? prev.totalScore / prev.totalQuizzes : 0;
      const currentAvg = current.totalQuizzes > 0 ? current.totalScore / current.totalQuizzes : 0;
      return prevAvg > currentAvg ? prev : current;
    });
    bestCategoryDisplay = bestCategory.category;
  }

  return (
    <div className={styles.statsContainer}>
      <Card className={styles.statCard}>
        <Typography variant="h3" className={styles.statTitle}>
          Your Quiz Performance
        </Typography>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <Typography variant="body2">Total Quizzes</Typography>
            <div className={styles.statValue} data-icon="🎯">
              {totalQuizzes}
            </div>
          </div>
          <div className={styles.statItem}>
            <Typography variant="body2">Average Score</Typography>
            <div className={styles.statValue} data-icon="📈">
              {averageScore.toFixed(0)}%
            </div>
          </div>
          <div className={styles.statItem}>
            <Typography variant="body2">Best Category</Typography>
            <div className={styles.statValue} data-icon="🏆">
              {bestCategoryDisplay}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsPanel;
