import React from 'react';
import { Typography, Card } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import styles from './RecentActivity.module.css';

type RecentActivityProps = {
  activities: QuizSessionHistory[];
  onActivityClick: (sessionId: number) => void;
};

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, onActivityClick }) => {
  const getRelativeTimeGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    // strip time components to get local‐midnight
    const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((localToday.getTime() - localDate.getTime()) / msInDay);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    // Check if the date is in the current month and year, but not today or yesterday
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      diffDays > 1
    ) {
      return 'This Month';
    }
    return 'Earlier';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Filter out activities with null completed_at before grouping
  const completedActivities = activities.filter((activity) => activity.completed_at !== null);

  const groupedActivities = completedActivities.reduce(
    (groups, activity) => {
      const timeGroup = getRelativeTimeGroup(activity.completed_at as string);
      return {
        ...groups,
        [timeGroup]: [...(groups[timeGroup] || []), activity],
      };
    },
    {} as Record<string, QuizSessionHistory[]>
  );

  return (
    <>
      <Card className={styles.recentActivityCard}>
        <div className={styles.recentActivityHeader}>
          <Typography variant="h3">Recent Activity</Typography>
        </div>
        <div className={styles.recentActivityContent}>
          {['Today', 'Yesterday', 'This Month', 'Earlier'].map((group) => {
            const groupActivities: QuizSessionHistory[] | undefined = groupedActivities[group];
            if (!groupActivities || groupActivities.length === 0) {
              return null;
            }
            return (
              <div key={group} className={styles.activityGroup}>
                <div className={styles.activityDate}>{group}</div>
                {groupActivities.map((activity: QuizSessionHistory) => (
                  <button
                    key={activity.id}
                    className={styles.activityItem}
                    onClick={() => onActivityClick(activity.id)}
                    aria-label={`${activity.is_group_session ? 'Group' : 'Solo'} quiz in ${activity.category} - ${activity.difficulty} difficulty, scored ${activity.score !== null ? activity.score : 'N/A'}/10 on ${formatDate(activity.completed_at as string)}`}
                  >
                    <div className={styles.activityContent}>
                      <Typography variant="body1" className={styles.activityTitle}>
                        {activity.is_group_session ? 'Group Quiz' : 'Solo Quiz'} -{' '}
                        {activity.category || 'Unknown Category'} -{' '}
                        {activity.difficulty || 'Unknown Difficulty'}
                      </Typography>
                      {activity.is_group_session && activity.group_players && (
                        <Typography variant="body2" className={styles.groupPlayers}>
                          Players: {activity.group_players.map((p) => p.name).join(', ')}
                        </Typography>
                      )}
                      <Typography variant="body2" className={styles.activityTime}>
                        {formatDate(activity.completed_at as string)}
                      </Typography>
                    </div>
                    <div className={styles.scoreInfo}>
                      <span className={styles.score}>
                        {activity.score !== null ? activity.score : 'N/A'}/10
                      </span>{' '}
                    </div>
                  </button>
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
