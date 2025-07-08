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
          soloQuizzesWithScores.reduce((sum, s) => sum + (s.score! / s.total_questions!) * 100, 0) /
            soloQuizzesWithScores.length
        )
      : 0;

  type Perf = { totalPercent: number; count: number };
  const categoryPerf: Record<string, Perf> = {};

  soloQuizzesWithScores.forEach((s) => {
    const pct = (s.score! / s.total_questions!) * 100;
    if (!categoryPerf[s.category]) {
      categoryPerf[s.category] = { totalPercent: 0, count: 0 };
    }
    categoryPerf[s.category].totalPercent += pct;
    categoryPerf[s.category].count += 1;
  });

  let bestCategoryDisplay = 'N/A';
  let highestAvg = -Infinity;

  Object.entries(categoryPerf).forEach(([cat, { totalPercent, count }]) => {
    const avg = totalPercent / count;
    if (avg > highestAvg) {
      highestAvg = avg;
      bestCategoryDisplay = cat;
    }
  });
  return (
    <div className={styles.statsContainer}>
      <Card className={styles.statCard}>
        <Typography variant="h3" className={styles.statTitle}>
          Your Quiz Performance
        </Typography>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <div className={styles.iconWrapper}>
              <Icon name="counter" size="medium" className={styles.statIcon} />
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
              <Icon name="percentage" size="medium" className={styles.statIcon} />
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
              <Icon name="star" size="medium" className={styles.statIcon} />
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
