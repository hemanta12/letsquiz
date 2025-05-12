import React from 'react';
import { Typography, Card } from '../common';
import { UserProfile, QuizSessionHistory, UserStatsResponse } from '../../types/api.types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  profile: UserProfile;
  sessions: QuizSessionHistory[];
  userApiStats: UserStatsResponse | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ profile, sessions, userApiStats }) => {
  const overallStats = userApiStats?.overall_stats;
  const categoryStats = userApiStats?.category_stats;

  const totalQuizzes = overallStats?.total_quizzes ?? sessions.length;
  const averageScore =
    overallStats?.accuracy ??
    (sessions.length > 0
      ? Math.round(
          (sessions.reduce((acc, s) => acc + (s.score ?? 0), 0) / (sessions.length * 10)) * 100
        )
      : 0);

  // Calculate best category from category stats
  let bestCategoryDisplay = 'N/A';
  if (categoryStats) {
    const bestCat = Object.entries(categoryStats).reduce(
      (best, [catName, catData]) => {
        const currentAccuracy = catData.total > 0 ? (catData.correct / catData.total) * 100 : 0;
        if (currentAccuracy > best.accuracy) {
          return { name: catName, accuracy: currentAccuracy };
        }
        return best;
      },
      { name: 'N/A', accuracy: 0 }
    );
    bestCategoryDisplay = bestCat.name;
  }

  return (
    <div className={styles.statsContainer}>
      <Card className={styles.statCard}>
        <Typography variant="h3" className={styles.statTitle}>
          Overall Stats
        </Typography>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <Typography variant="body2">Total Quizzes</Typography>
            <div className={styles.statValue}>{totalQuizzes}</div>
          </div>
          <div className={styles.statItem}>
            <Typography variant="body2">Average Score</Typography>
            <div className={styles.statValue}>{averageScore.toFixed(0)}%</div>
          </div>
          <div className={styles.statItem}>
            <Typography variant="body2">Best Category</Typography>
            <div className={styles.statValue}>{bestCategoryDisplay}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsPanel;
