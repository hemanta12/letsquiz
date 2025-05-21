import React, { useState, useMemo, useCallback } from 'react';
import { Typography, Card, Icon, Button } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import quizService from '../../services/quizService';
import styles from './RecentActivity.module.css';

type RecentActivityProps = {
  activities: QuizSessionHistory[];
  onActivityClick: (sessionId: number) => void;
  onDeleteSuccess: () => void;
};

const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onActivityClick,
  onDeleteSuccess,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessionActivities, setSessionActivities] = useState(activities);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) setConfirmDeleteId(null);
      return !prev;
    });
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setConfirmDeleteId(id);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDeleteId === null) return;
    try {
      await quizService.deleteQuizSession(confirmDeleteId);
      setSessionActivities((prev) => prev.filter((a) => a.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      onDeleteSuccess(); // Call the callback on success
    } catch (err: any) {
      alert(`Deletion failed: ${err.message || 'Unexpected error'}`);
    }
  }, [confirmDeleteId, onDeleteSuccess]); // Add onDeleteSuccess to dependency array

  const getRelativeTimeGroup = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(
      (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
        new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
        msInDay
    );
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      diffDays > 1
    )
      return 'This Month';
    return 'Earlier';
  }, []);

  const formatDate = useCallback((iso: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  }, []);

  const completedActivities = useMemo(
    () => sessionActivities.filter((a) => a.completed_at),
    [sessionActivities]
  );

  const groupedActivities = useMemo(() => {
    const groups: Record<string, QuizSessionHistory[]> = {};
    for (const act of completedActivities) {
      const grp = getRelativeTimeGroup(act.completed_at as string);
      groups[grp] = [...(groups[grp] || []), act];
    }
    return groups;
  }, [completedActivities, getRelativeTimeGroup]);

  return (
    <>
      <Card className={styles.recentActivityCard}>
        <div className={styles.recentActivityHeader}>
          <div className={styles.recentActivityHeaderContent}>
            <Typography variant="h3">Recent Activity</Typography>
            <button
              onClick={handleToggleEditMode}
              aria-label={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
              className={styles.editModeToggle}
            >
              <Icon name={isEditMode ? 'close' : 'edit'} size="medium" />
            </button>
          </div>
        </div>

        <div className={styles.recentActivityContent}>
          {['Today', 'Yesterday', 'This Month', 'Earlier'].map((group) => {
            const items = groupedActivities[group];
            if (!items || items.length === 0) return null;
            return (
              <div key={group} className={styles.activityGroup} data-group={group}>
                <div className={styles.activityDate}>{group}</div>
                {items.map((activity) => (
                  <div key={activity.id} className={styles.activityRow}>
                    <button
                      className={styles.activityItem}
                      onClick={() => onActivityClick(activity.id)}
                    >
                      <div className={styles.activityContent}>
                        <Typography variant="body2" className={styles.activityTime}>
                          {formatDate(activity.completed_at!)}
                        </Typography>
                        <Typography variant="body1" className={styles.activityTitle}>
                          {activity.is_group_session ? 'Group Quiz' : 'Solo Quiz'} –{' '}
                          {activity.category} – {activity.difficulty}
                        </Typography>
                        {activity.is_group_session && activity.group_players && (
                          <Typography variant="body2" className={styles.groupPlayers}>
                            Players: {activity.group_players.map((p) => p.name).join(', ')}
                          </Typography>
                        )}
                      </div>
                      <div className={styles.scoreInfo}>
                        <span className={styles.score}>
                          {activity.score ?? 0} / {activity.totalQuestions ?? 'N/A'}
                        </span>
                      </div>
                    </button>

                    {isEditMode &&
                      (confirmDeleteId === activity.id ? (
                        <div className={styles.inlineConfirm}>
                          <Typography variant="body2">Confirm delete?</Typography>
                          <Button variant="secondary" onClick={handleCancelDelete}>
                            No
                          </Button>
                          <Button variant="quit" onClick={handleConfirmDelete}>
                            Yes
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleDeleteClick(activity.id)}
                          aria-label="Delete session"
                          className={styles.deleteButton}
                        >
                          <Icon name="delete" size="medium" />
                        </Button>
                      ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

export default RecentActivity;
