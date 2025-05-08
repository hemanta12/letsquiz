import React, { useState, useCallback, useMemo } from 'react';
import { Typography } from '../common';
import Modal from '../common/Modal';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchSingleDetailedQuizSession,
  clearSelectedDetailedSession,
} from '../../store/slices/userSlice';
import ActivityDetailContent from './ActivityDetailContent';

import CategoryList from './CategoryList';
import RecentActivity from './RecentActivity';
import StatsPanel from './StatsPanel';
import { UserProfile, QuizSessionHistory } from '../../types/api.types';
import { calculateCategoryStats } from '../../utils/dashboardUtils';
import styles from './DashboardContent.module.css';

interface DashboardContentProps {
  profile: UserProfile;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ profile }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const dispatch = useAppDispatch();
  const { selectedDetailedSession, loadingSelectedDetailedSession, errorSelectedDetailedSession } =
    useAppSelector((state) => state.user);

  const [showModal, setShowModal] = useState(false);

  const sessions = useMemo(() => profile.quiz_history || [], [profile.quiz_history]);

  const categoryStats = calculateCategoryStats(sessions);

  const recentActivity = sessions
    .filter((session) => session.completed_at !== null)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime()
    );

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

  const handleQuizCardClick = useCallback(
    (session: QuizSessionHistory) => {
      dispatch(fetchSingleDetailedQuizSession(session.id));
      setShowModal(true);
    },
    [dispatch]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    dispatch(clearSelectedDetailedSession());
  }, [dispatch]);

  const handleActivityClick = useCallback(
    (sessionId: number) => {
      dispatch(fetchSingleDetailedQuizSession(sessionId));
      setShowModal(true);
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      setExpandedCategories((prev) => new Set(prev).add(session.category));

      setTimeout(() => {
        const quizElement = document.getElementById(`quiz-${sessionId}`);
        if (quizElement) {
          quizElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quizElement.focus();
        }
      }, 100);
    },
    [dispatch, sessions]
  );

  if (loadingSelectedDetailedSession) {
    return (
      <Modal open={showModal} onClose={handleCloseModal}>
        <Typography variant="body1">Loading session details...</Typography>
      </Modal>
    );
  }

  if (errorSelectedDetailedSession) {
    return (
      <Modal open={showModal} onClose={handleCloseModal}>
        <Typography variant="body1" color="error">
          {errorSelectedDetailedSession}
        </Typography>
      </Modal>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      <StatsPanel profile={profile} stats={categoryStats} sessions={sessions} />
      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History</Typography>
          </div>

          {sessions.length === 0 ? (
            <Typography variant="body1">No quiz history available yet.</Typography>
          ) : (
            <CategoryList
              categoryStats={categoryStats}
              sessions={sessions}
              expandedCategories={expandedCategories}
              onCategoryToggle={handleCategoryToggle}
              onQuizCardClick={handleQuizCardClick}
            />
          )}
        </div>
        <RecentActivity activities={recentActivity} onActivityClick={handleActivityClick} />{' '}
      </div>

      <Modal open={showModal && selectedDetailedSession !== null} onClose={handleCloseModal}>
        {' '}
        {selectedDetailedSession && (
          <ActivityDetailContent quizHistory={sessions} sessionId={selectedDetailedSession.id} />
        )}
      </Modal>
    </div>
  );
};

export default DashboardContent;
