import React from 'react';
import { Typography } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import QuizCard from './QuizCard';
import styles from './GroupQuizzes.module.css';

type GroupQuizzesProps = {
  sessions: QuizSessionHistory[];
  onQuizCardClick: (session: QuizSessionHistory) => void;
};

const GroupQuizzes: React.FC<GroupQuizzesProps> = ({ sessions, onQuizCardClick }) => {
  // Filter and sort group sessions
  const groupSessions = sessions
    .filter((session) => session.is_group_session && session.completed_at !== null)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return (
        new Date(b.completed_at as string).getTime() - new Date(a.completed_at as string).getTime()
      );
    });

  if (groupSessions.length === 0) {
    return null;
  }

  return (
    <div className={styles.groupQuizzesContainer}>
      <div className={styles.groupQuizzesHeader}>
        <Typography variant="h3">Group Quizzes</Typography>
      </div>
      <div className={styles.quizGrid}>
        {groupSessions.map((session: QuizSessionHistory) => (
          <QuizCard key={session.id} session={session} onClick={() => onQuizCardClick(session)} />
        ))}
      </div>
    </div>
  );
};

export default GroupQuizzes;
