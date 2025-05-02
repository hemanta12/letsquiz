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
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Last Week';
    if (diffDays <= 30) return 'Last Month';
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

  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const timeGroup = getRelativeTimeGroup(activity.started_at);
      return {
        ...groups,
        [timeGroup]: [...(groups[timeGroup] || []), activity],
      };
    },
    {} as Record<string, QuizSessionHistory[]>
  );

  return (
    <Card className={styles.recentActivityCard}>
      <div className={styles.recentActivityHeader}>
        <Typography variant="h3">Recent Activity</Typography>
      </div>
      <div className={styles.recentActivityContent}>
        {Object.entries(groupedActivities).map(([group, groupActivities]) => (
          <div key={group} className={styles.activityGroup}>
            <div className={styles.activityDate}>{group}</div>
            {groupActivities.map((activity) => (
              <button
                key={activity.id}
                className={styles.activityItem}
                onClick={() => onActivityClick(activity.id)}
                aria-label={`${activity.category} quiz in ${activity.difficulty} difficulty, scored ${activity.score !== null ? activity.score : 'N/A'}/10 on ${formatDate(activity.started_at)}`}
              >
                <div className={styles.activityContent}>
                  <Typography variant="body1" className={styles.activityTitle}>
                    {activity.category} - {activity.difficulty}
                  </Typography>
                  <Typography variant="body2" className={styles.activityTime}>
                    {formatDate(activity.started_at)}
                  </Typography>
                </div>
                <div className={styles.scoreInfo}>
                  <span className={styles.score}>
                    {activity.score !== null ? activity.score : 'N/A'}/10
                  </span>{' '}
                  {/* Handle null score */}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecentActivity;
