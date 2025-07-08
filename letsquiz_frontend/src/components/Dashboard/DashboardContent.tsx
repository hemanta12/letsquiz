import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Typography } from '../common/Typography';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchSingleDetailedQuizSession,
  clearSelectedDetailedSession,
  cleanExpiredCache,
} from '../../store/slices/userSlice';
import ActivityDetailContent from './ActivityDetailContent';
import CategoryList from './CategoryList';
import RecentActivity from './RecentActivity';
import StatsPanel from './StatsPanel';
import GroupQuizzes from './GroupQuizzes';
import { UserProfile } from '../../types/api.types';
import { calculateCategoryStats } from '../../utils/dashboardUtils';
import { fetchQuizHistoryThunk } from '../../store/slices/quizSlice';
import styles from './DashboardContent.module.css';

interface DashboardContentProps {
  profile: UserProfile;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ profile }) => {
  const dispatch = useAppDispatch();
  const { userId, isAuthenticated } = useAppSelector((state) => ({
    userId: state.auth.userId,
    isAuthenticated: state.auth.isAuthenticated,
  }));
  const { selectedDetailedSession, loadingSelectedDetailedSession, errorSelectedDetailedSession } =
    useAppSelector((state) => state.user);

  const {
    sessions: reduxSessions,
    historyLoading,
    historyError,
  } = useAppSelector((state) => state.quiz);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const categoryStats = useMemo(() => {
    return calculateCategoryStats(reduxSessions || []);
  }, [reduxSessions]);

  const recentActivities = useMemo(() => {
    if (!reduxSessions || reduxSessions.length === 0) return [];
    return reduxSessions
      .filter((session) => session.completed_at)
      .sort(
        (a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      );
  }, [reduxSessions]);

  const handleCategoryToggle = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const openDetail = useCallback(
    (id: number) => {
      dispatch(fetchSingleDetailedQuizSession(id));
      setShowModal(true);
    },
    [dispatch]
  );

  const closeDetail = useCallback(() => {
    setShowModal(false);
    dispatch(clearSelectedDetailedSession());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      dispatch(fetchQuizHistoryThunk());
    }
  }, [dispatch, isAuthenticated, userId]);

  // Periodic cache cleanup - runs every 2 minutes
  useEffect(() => {
    const cleanup = setInterval(
      () => {
        dispatch(cleanExpiredCache());
      },
      2 * 60 * 1000
    );

    return () => clearInterval(cleanup);
  }, [dispatch]);

  if (!isAuthenticated) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Authentication Required</Typography>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (historyLoading) return <Loading />;

  if (historyError) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Error Loading Dashboard</Typography>
        <p>{historyError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      <StatsPanel
        profile={{ ...profile, quiz_history: profile.quiz_history || [] }}
        sessions={reduxSessions || []}
        categoryStats={categoryStats}
      />

      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History (Solo Mode)</Typography>
          </div>
          {reduxSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Typography variant="body1">No quiz history available yet.</Typography>
            </div>
          ) : (
            <CategoryList
              categoryStats={categoryStats}
              sessions={reduxSessions}
              expandedCategories={expandedCategories}
              onCategoryToggle={handleCategoryToggle}
              onQuizCardClick={(session) => openDetail(session.id)}
            />
          )}
        </div>
        <div className={styles.recentActivityContainer}>
          <RecentActivity
            activities={recentActivities}
            onActivityClick={(sessionId) => openDetail(sessionId)}
            onDeleteSuccess={() => dispatch(fetchQuizHistoryThunk())}
          />
        </div>
      </div>

      <GroupQuizzes
        sessions={reduxSessions || []}
        onQuizCardClick={(session) => openDetail(session.id)}
      />

      <Modal open={showModal} onClose={closeDetail} title="Activity Details">
        {loadingSelectedDetailedSession ? (
          <Loading />
        ) : errorSelectedDetailedSession ? (
          <div className={styles.dashboardError}>
            <Typography variant="h3">Error</Typography>
            <p>{errorSelectedDetailedSession}</p>
          </div>
        ) : selectedDetailedSession ? (
          <ActivityDetailContent sessionDetail={selectedDetailedSession} />
        ) : null}
      </Modal>
    </div>
  );
};

export default DashboardContent;
