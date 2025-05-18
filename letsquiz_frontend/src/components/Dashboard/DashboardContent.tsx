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
import {
  UserProfile,
  QuizSessionHistory,
  CategoryStats,
  UserStatsResponse,
} from '../../types/api.types';
import { QuizSession } from '../../types/dashboard.types';
import { calculateCategoryStats } from '../../utils/dashboardUtils';
import userService from '../../services/userService';
import { fetchUserStats } from '../../services/apiClient';
import styles from './DashboardContent.module.css';

interface DashboardContentProps {
  profile: UserProfile;
}

const toQuizSessionHistory = (session: QuizSession): QuizSessionHistory => ({
  id: session.id,
  started_at: session.started_at,
  completed_at: session.completed_at,
  score: session.score,
  category: session.category,
  difficulty: session.difficulty,
  is_group_session: session.is_group_session,
  group_players: session.group_players,
});

const selectAuth = (state: any) => ({
  userId: state.auth.userId,
  isAuthenticated: state.auth.isAuthenticated,
});

const DashboardContent: React.FC<DashboardContentProps> = ({ profile }) => {
  const dispatch = useAppDispatch();
  const { userId, isAuthenticated } = useAppSelector(selectAuth);
  const { selectedDetailedSession, loadingSelectedDetailedSession, errorSelectedDetailedSession } =
    useAppSelector((s) => s.user);

  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [userApiStats, setUserApiStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);

  // 1) Fetch both quiz-history and user-stats in one go
  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // history from your userService
        const raw = await userService.fetchUserQuizHistory(userId.toString());
        console.log('Raw quiz history data:', raw);
        const wellTyped: QuizSession[] = raw.map((s) => ({
          id: s.id,
          details: s.details ?? [],
          category: s.category || 'Uncategorized',
          difficulty: s.difficulty || 'Unknown',
          score: s.score ?? 0,
          started_at: s.started_at,
          completed_at: s.completed_at,
          is_group_session: s.is_group_session ?? false,
          group_players: s.group_players ?? [],
        }));
        setSessions(wellTyped);

        // per-category stats
        setCategoryStats(calculateCategoryStats(wellTyped));

        // user API stats for the top panel
        const apiStats = await fetchUserStats(userId);
        setUserApiStats(apiStats.data);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, isAuthenticated]);

  const sessionHistories = useMemo(() => sessions.map(toQuizSessionHistory), [sessions]);

  const recentActivity = useMemo(
    () =>
      sessionHistories
        .filter((s) => s.completed_at)
        .sort(
          (a, b) =>
            new Date(b.completed_at as string).getTime() -
            new Date(a.completed_at as string).getTime()
        ),
    [sessionHistories]
  );

  const handleCategoryToggle = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const nxt = new Set(prev);
      nxt.has(cat) ? nxt.delete(cat) : nxt.add(cat);
      return nxt;
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
        sessions={sessionHistories}
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
              sessions={sessionHistories}
              expandedCategories={expandedCategories}
              onCategoryToggle={handleCategoryToggle}
              onQuizCardClick={(session) => openDetail(session.id)}
            />
          )}
        </div>

        <RecentActivity
          activities={recentActivity}
          onActivityClick={(sessionId) => openDetail(sessionId)}
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
