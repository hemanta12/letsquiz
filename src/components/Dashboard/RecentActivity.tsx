import React from 'react';
import { Typography, Card } from '../common';
import { QuizSession } from '../../types/dashboard.types';
import styles from './RecentActivity.module.css';

type RecentActivityProps = {
  activities: QuizSession[];
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
      const timeGroup = getRelativeTimeGroup(activity.time);
      return {
        ...groups,
        [timeGroup]: [...(groups[timeGroup] || []), activity],
      };
    },
    {} as Record<string, QuizSession[]>
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
                aria-label={`${activity.category} quiz in ${activity.level} difficulty, scored ${activity.score}/10 on ${formatDate(activity.time)}`}
              >
                <div className={styles.activityContent}>
                  <Typography variant="body1" className={styles.activityTitle}>
                    {activity.category} - {activity.level}
                  </Typography>
                  <Typography variant="body2" className={styles.activityTime}>
                    {formatDate(activity.time)}
                  </Typography>
                </div>
                <div className={styles.scoreInfo}>
                  <span className={styles.score}>{activity.score}/10</span>
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
