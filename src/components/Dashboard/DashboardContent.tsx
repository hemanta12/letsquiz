import React, { useState, useCallback, useMemo } from 'react';
import { Typography } from '../common';
import CategoryList from './CategoryList';
import RecentActivity from './RecentActivity';
import StatsPanel from './StatsPanel';
import { QuizSessionHistory, UserProfile, LeaderboardEntry } from '../../types/api.types';
import { calculateCategoryStats } from '../../utils/dashboardUtils';
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
  profile: UserProfile;
  leaderboard: LeaderboardEntry[];
}

const DashboardContent: React.FC<DashboardContentProps> = ({ profile, leaderboard }) => {
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Use quiz_history from the profile, providing a default empty array if undefined
  const sessions = useMemo(() => profile.quiz_history || [], [profile.quiz_history]);

  const categoryStats = calculateCategoryStats(sessions);

  const recentActivity = sessions
    .slice() // Create a shallow copy before sorting
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
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
      <div style={{ border: '2px solid blue' }}>Dashboard Content is rendering</div>{' '}
      <StatsPanel profile={profile} stats={categoryStats} sessions={sessions} />
      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History</Typography>
          </div>
          <CategoryList
            profile={profile}
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
      {/* Add a component for displaying the leaderboard here */}
      {/* <LeaderboardDisplay leaderboard={leaderboard} /> */}
    </div>
  );
};

export default DashboardContent;
