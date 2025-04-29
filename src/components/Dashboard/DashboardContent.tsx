import React, { useState, useCallback } from 'react';
import { Typography } from '../common';
import CategoryList from './CategoryList';
import RecentActivity from './RecentActivity';
import StatsPanel from './StatsPanel';
import { QuizSession, CategoryStats } from '../../types/dashboard.types';
import { calculateCategoryStats, groupActivitiesByDate } from '../../utils/dashboardUtils';
import styles from './DashboardContent.module.css';

const categoryIcons: Record<string, string> = {
  History: '📚',
  Science: '🔬',
  Geography: '🌍',
  Movies: '🎬',
  Sports: '⚽',
  Trivia: '❓',
  default: '📚',
};

interface DashboardContentProps {
  sessions: QuizSession[];
}

const DashboardContent: React.FC<DashboardContentProps> = ({ sessions }) => {
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categoryStats = calculateCategoryStats(sessions);
  const recentActivity = sessions
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  const handleCategoryToggle = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  const handleExpandSession = useCallback((sessionId: number) => {
    setExpandedSession((prev) => (prev === sessionId ? null : sessionId));
  }, []);

  const handleActivityClick = useCallback(
    (sessionId: number) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      setExpandedCategories((prev) => new Set(prev).add(session.category));

      setTimeout(() => {
        setExpandedSession(sessionId);
        const quizElement = document.getElementById(`quiz-${sessionId}`);
        if (quizElement) {
          quizElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quizElement.focus();
        }
      }, 100);
    },
    [sessions]
  );

  return (
    <div className={styles.dashboardContent}>
      <StatsPanel stats={categoryStats} sessions={sessions} />

      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History</Typography>
          </div>
          <CategoryList
            categoryStats={categoryStats}
            sessions={sessions}
            expandedCategories={expandedCategories}
            expandedSession={expandedSession}
            onCategoryToggle={handleCategoryToggle}
            onSessionExpand={handleExpandSession}
            categoryIcons={categoryIcons}
          />
        </div>
        <RecentActivity activities={recentActivity} onActivityClick={handleActivityClick} />
      </div>
    </div>
  );
};

export default DashboardContent;
