import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Typography, Card, Icon, Button } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import { getWinnerDisplay, getRelativeTimeGroup, formatDate } from '../../utils/activityUtils';
import quizService from '../../services/quizService';
import styles from './RecentActivity.module.css';

interface RecentActivityProps {
  activities: QuizSessionHistory[];
  onActivityClick: (sessionId: number) => void;
  onDeleteSuccess: () => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onActivityClick,
  onDeleteSuccess,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessionActivities, setSessionActivities] = useState(activities);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Sync sessionActivities with activities prop
  useEffect(() => {
    setSessionActivities(activities);
  }, [activities]);

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
      onDeleteSuccess();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message || 'Unexpected error'}`);
    }
  }, [confirmDeleteId, onDeleteSuccess]);

  const completedActivities = useMemo<QuizSessionHistory[]>(
    () => sessionActivities.filter((a) => a.completed_at),
    [sessionActivities]
  );

  const groupedActivities = useMemo<Record<string, QuizSessionHistory[]>>(() => {
    const groups: Record<string, QuizSessionHistory[]> = {};
    for (const act of completedActivities) {
      const grp = getRelativeTimeGroup(act.completed_at as string);
      groups[grp] = [...(groups[grp] || []), act];
    }
    return groups;
  }, [completedActivities]);

  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

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

            const isExpanded = expandedGroups[group];
            const visibleItems = isExpanded ? items : items.slice(0, 5);

            return (
              <div key={group} className={styles.activityGroup} data-group={group}>
                <div className={styles.activityDate}>{group}</div>
                {visibleItems.map((activity: QuizSessionHistory) => (
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
                          {activity.is_group_session ? 'Group Quiz' : 'Solo Quiz'} -{' '}
                          {activity.category} - {activity.difficulty}
                        </Typography>
                        {activity.is_group_session && activity.group_players && (
                          <Typography variant="caption" className={styles.groupPlayers}>
                            {' '}
                            Players:{' '}
                            {activity.group_players.map((p: { name: string }) => p.name).join(', ')}
                          </Typography>
                        )}
                      </div>
                      <div className={styles.scoreInfo}>
                        <span
                          className={`${styles.score} ${getWinnerDisplay(activity).isWinner ? styles.winnerText : ''}`}
                        >
                          {/* Show percentage for solo mode */}
                          {!activity.is_group_session &&
                          (activity.total_questions ?? 0) > 0 &&
                          activity.score !== null
                            ? `${activity.score} / ${activity.total_questions} (${Math.round((activity.score / (activity.total_questions ?? 1)) * 100)}%)`
                            : getWinnerDisplay(activity).text}
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
                          <Icon name="delete" size="small" />
                        </Button>
                      ))}
                  </div>
                ))}
                {items.length > 5 && (
                  <div className={styles.showMoreContainer}>
                    <Button
                      variant="secondary"
                      onClick={() => toggleGroup(group)}
                      className={styles.showMoreButton}
                    >
                      {isExpanded ? 'Show Less' : 'Show More'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

export default RecentActivity;
