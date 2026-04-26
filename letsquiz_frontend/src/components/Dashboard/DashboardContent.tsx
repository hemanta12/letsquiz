import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Typography } from '../common/Typography';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchSingleDetailedQuizSession,
  clearSelectedDetailedSession,
  fetchUserProfile,
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
  const userId = useAppSelector((state) => state.auth.userId);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { selectedDetailedSession, loadingSelectedDetailedSession, errorSelectedDetailedSession } =
    useAppSelector((state) => state.user);

  const {
    sessions: reduxSessions,
    historyLoading,
    historyError,
    lastHistoryFetch: quizLastHistoryFetch,
  } = useAppSelector((state) => state.quiz);
  const { lastProfileFetch } = useAppSelector((state) => state.user);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const historyFetchAttempted = useRef(false);

  useEffect(() => {
    if (isAuthenticated && userId && !historyFetchAttempted.current) {
      historyFetchAttempted.current = true;
      dispatch(fetchQuizHistoryThunk());
    }
  }, [dispatch, isAuthenticated, userId]);

  // Cleanup expired cache periodically
  useEffect(() => {
    const cleanup = setInterval(
      () => {
        dispatch(cleanExpiredCache());
      },
      3 * 60 * 1000
    ); // Clean every 3 minutes

    return () => clearInterval(cleanup);
  }, [dispatch]);

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

  const handleSmartRefresh = useCallback(() => {
    const now = Date.now();

    // Force refresh quiz history if it's stale (older than 5 minutes)
    const historyAge = quizLastHistoryFetch ? now - quizLastHistoryFetch : Infinity;
    if (historyAge > 5 * 60 * 1000) {
      console.log('[Cache] Refreshing stale quiz history');
      dispatch(fetchQuizHistoryThunk());
    } else {
      console.log('[Cache] Quiz history is fresh, skipping refresh');
    }

    // Force refresh user profile if it's stale (older than 8 minutes)
    const profileAge = lastProfileFetch ? now - lastProfileFetch : Infinity;
    if (profileAge > 8 * 60 * 1000 && userId) {
      console.log('[Cache] Refreshing stale user profile');
      dispatch(fetchUserProfile(userId.toString()));
    } else {
      console.log('[Cache] User profile is fresh, skipping refresh');
    }

    // Clean expired session cache
    dispatch(cleanExpiredCache());
  }, [dispatch, userId, quizLastHistoryFetch, lastProfileFetch]);

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
            <Button onClick={handleSmartRefresh} variant="secondary" size="small">
              Refresh
            </Button>
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
            onDeleteSuccess={() => {
              // Force refresh after deletion since data has changed
              console.log('[Cache] Session deleted, forcing data refresh');
              dispatch(fetchQuizHistoryThunk());
              if (userId) {
                dispatch(fetchUserProfile(userId.toString()));
              }
            }}
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
