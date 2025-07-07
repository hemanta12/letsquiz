import React from 'react';
import { Typography, Card, Icon } from '../common';
import { UserProfile, QuizSessionHistory, CategoryStats } from '../../types/api.types';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  profile: UserProfile;
  sessions: QuizSessionHistory[];
  categoryStats: CategoryStats[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ profile, sessions, categoryStats }) => {
  const soloSessions = sessions.filter((s) => !s.is_group_session);
  const groupSessions = sessions.filter((s) => s.is_group_session);
  const totalSoloQuizzes = soloSessions.length;
  const totalGroupQuizzes = groupSessions.length;
  const totalQuizzes = sessions.length;

  // Calculate average score for SOLO quizzes only
  const soloQuizzesWithScores = soloSessions.filter(
    (s) => s.score !== null && s.total_questions !== null
  );
  const averageScore =
    soloQuizzesWithScores.length > 0
      ? Math.round(
          (soloQuizzesWithScores.reduce((acc, s) => acc + (s.score ?? 0), 0) /
            soloQuizzesWithScores.reduce((acc, s) => acc + (s.total_questions ?? 0), 0)) *
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
            <div className={styles.iconWrapper}>
              <Icon name="quiz" size="medium" className={styles.statIcon} />
            </div>
            <Typography variant="body2" className={styles.statLabel}>
              Total Quizzes
            </Typography>
            <div className={styles.statValue}>{totalQuizzes}</div>
            <div className={styles.statSubtext}>
              <span>Solo: {totalSoloQuizzes}</span>
              <span> Group: {totalGroupQuizzes}</span>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.iconWrapper}>
              <Icon name="chart" size="medium" className={styles.statIcon} />
            </div>
            <Typography variant="body2" className={styles.statLabel}>
              Average Score
            </Typography>
            <div className={styles.statValue}>{averageScore}%</div>
            {/* <div className={styles.statSubtext}>
              <span>Across {totalSoloQuizzes} solo quizzes</span>
            </div> */}
          </div>
          <div className={styles.statItem}>
            <div className={styles.iconWrapper}>
              <Icon name="trophy" size="medium" className={styles.statIcon} />
            </div>
            <Typography variant="body2" className={styles.statLabel}>
              Best Category
            </Typography>
            <div className={styles.statValue}>{bestCategoryDisplay}</div>
            {/* <div className={styles.statSubtext}>
              <span>Your strongest subject</span>
            </div> */}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StatsPanel;
