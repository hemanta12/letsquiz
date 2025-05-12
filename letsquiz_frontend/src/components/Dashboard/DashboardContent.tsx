import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import styles from './DashboardContent.module.css';
import userService from '../../services/userService';
import { fetchUserStats } from '../../services/apiClient';

interface DashboardContentProps {
  profile: UserProfile;
}

const selectAuthState = (state: any) => ({
  userId: state.auth.userId,
  isAuthenticated: state.auth.isAuthenticated,
});

const toQuizSessionHistory = (session: QuizSession): QuizSessionHistory => ({
  id: session.id,
  started_at: session.started_at,
  completed_at: session.completed_at,
  score: session.score,
  category: session.category,
  difficulty: session.difficulty,
});

const DashboardContent: React.FC<DashboardContentProps> = ({ profile }) => {
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [userApiStats, setUserApiStats] = useState<UserStatsResponse | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const dispatch = useAppDispatch();
  const { selectedDetailedSession, loadingSelectedDetailedSession, errorSelectedDetailedSession } =
    useAppSelector((state) => state.user);
  const { userId, isAuthenticated } = useAppSelector(selectAuthState);

  const [showModal, setShowModal] = useState(false);

  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !isAuthenticated) {
        setStatsError('User not authenticated');
        setIsLoadingStats(false); // Ensure loading is stopped
        return;
      }

      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const userSessions = await userService.fetchUserQuizHistory(userId);

        const wellTypedSessions: QuizSession[] = (userSessions || []).map((s) => {
          const session: QuizSession = {
            id: s.id,
            details: s.details || [],
            category: s.category || 'Uncategorized',
            difficulty: s.difficulty || 'Unknown',
            score: s.score || 0,
            started_at: s.started_at || new Date().toISOString(),
            completed_at: s.completed_at || null,
          };
          return session;
        });

        setSessions(wellTypedSessions);

        const clientCalculatedCategoryStats = calculateCategoryStats(wellTypedSessions);
        setCategoryStats(clientCalculatedCategoryStats);

        const apiStatsResponse = await fetchUserStats(userId);
        setUserApiStats(apiStatsResponse.data);
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        setStatsError(error.message || 'Failed to load user data. Please try again.');
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchUserData();
  }, [userId, isAuthenticated]);

  const sessionHistories = useMemo(() => sessions.map(toQuizSessionHistory), [sessions]);

  const recentActivity = useMemo(
    () =>
      sessionHistories
        .filter((session) => session.completed_at !== null)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.completed_at as string).getTime() -
            new Date(a.completed_at as string).getTime()
        ),
    [sessionHistories]
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
      const sessionForCategory = sessions.find((s) => s.id === sessionId);
      if (sessionForCategory) {
        setExpandedCategories((prev) => new Set(prev).add(sessionForCategory.category));
      }

      setTimeout(() => {
        const quizElement = document.getElementById(`quiz-${sessionId}`);
        if (quizElement) {
          quizElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quizElement.focus();
        }
      }, 100);
    },
    [dispatch, sessions] // Depends on original sessions for category
  );

  if (!isAuthenticated && !isLoadingStats) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Authentication Required</Typography>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  if (isLoadingStats) {
    return <Loading />;
  }

  if (statsError) {
    return (
      <div className={styles.dashboardError}>
        <Typography variant="h3">Unable to Load Dashboard</Typography>
        <p>{statsError}</p>
        <Button onClick={() => window.location.reload()}>Retry Loading</Button>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      {/* StatsPanel expects QuizSessionHistory[] and now userApiStats */}
      <StatsPanel
        profile={{
          ...profile,
          quiz_history: profile.quiz_history || [],
        }}
        sessions={sessionHistories || []}
        userApiStats={userApiStats}
      />
      <div className={styles.contentRow}>
        <div className={styles.historyContainer}>
          <div className={styles.historyHeader}>
            <Typography variant="h3">Quiz History</Typography>
          </div>
          {/* CategoryList expects QuizSessionHistory[] */}
          {sessionHistories.length === 0 ? (
            <div className={styles.emptyState}>
              <Typography variant="body1">No quiz history available yet.</Typography>
            </div>
          ) : (
            <CategoryList
              categoryStats={categoryStats}
              sessions={sessionHistories}
              expandedCategories={expandedCategories}
              onCategoryToggle={handleCategoryToggle}
              onQuizCardClick={handleQuizCardClick}
            />
          )}
        </div>
        {/* RecentActivity expects QuizSessionHistory[] (based on current recentActivity derivation) */}
        <RecentActivity activities={recentActivity} onActivityClick={handleActivityClick} />
      </div>

      <Modal open={showModal && !!selectedDetailedSession} onClose={handleCloseModal}>
        {selectedDetailedSession && (
          <ActivityDetailContent quizHistory={sessions} sessionId={selectedDetailedSession.id} />
        )}
      </Modal>
    </div>
  );
};

export default DashboardContent;
