import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Typography } from '../common/Typography';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  fetchSingleDetailedQuizSession,
  clearSelectedDetailedSession,
} from '../../store/slices/userSlice';
import ActivityDetailContent from './ActivityDetailContent';
import CategoryList from './CategoryList';
import RecentActivity from './RecentActivity';
import StatsPanel from './StatsPanel';
import { UserProfile, CategoryStats, UserStatsResponse } from '../../types/api.types';
import { QuizSession } from '../../types/dashboard.types';
import { calculateCategoryStats } from '../../utils/dashboardUtils';
import userService from '../../services/userService';
import { fetchUserStats } from '../../services/apiClient';
import quizService from '../../services/quizService';
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

  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [userApiStats, setUserApiStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const userIdString = userId ? userId.toString() : '';

    if (!userIdString || !isAuthenticated) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      /* Fetch both quiz history and stats concurrently for better performance */
      const [rawSessions, apiStats] = await Promise.all([
        userService.fetchUserQuizHistory(userIdString),
        fetchUserStats(userIdString),
      ]);

      /* Enhance sessions with question counts and handle potential failures gracefully */
      const sessionsWithQuestionCounts = await Promise.all(
        rawSessions.map(async (session) => {
          try {
            const totalQuestions = await quizService.fetchQuestionCount(session.id);
            return { ...session, totalQuestions };
          } catch (error) {
            console.error(`Failed to fetch question count for session ${session.id}:`, error);
            return { ...session, totalQuestions: 0 };
          }
        })
      );

      setSessions(sessionsWithQuestionCounts);
      setCategoryStats(calculateCategoryStats(sessionsWithQuestionCounts));
      setUserApiStats(apiStats.data);
    } catch (e: any) {
      console.error('Dashboard data fetch error:', e);
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeleteSuccess = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* Filter and sort recent activities for efficient rendering */
  const recentActivities = useMemo(() => {
    if (!sessions.length) return [];
    return sessions
      .filter((session) => session.completed_at)
      .sort(
        (a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
      )
      .slice(0, 5);
  }, [sessions]);

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

  if (!isAuthenticated && !loading) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Authentication Required</Typography>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Error Loading Dashboard</Typography>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      <StatsPanel
        profile={{ ...profile, quiz_history: profile.quiz_history || [] }}
        sessions={sessions}
        userApiStats={userApiStats}
      />

      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History</Typography>
          </div>
          {sessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Typography variant="body1">No quiz history available yet.</Typography>
            </div>
          ) : (
            <CategoryList
              categoryStats={categoryStats}
              sessions={sessions}
              expandedCategories={expandedCategories}
              onCategoryToggle={handleCategoryToggle}
              onQuizCardClick={(session) => openDetail(session.id)}
            />
          )}
        </div>

        <RecentActivity
          activities={recentActivities}
          onActivityClick={(sessionId) => openDetail(sessionId)}
          onDeleteSuccess={handleDeleteSuccess}
        />
      </div>

      <Modal open={showModal} onClose={closeDetail}>
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
