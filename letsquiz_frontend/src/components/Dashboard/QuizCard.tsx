import React from 'react';
import { Typography } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import styles from './QuizCard.module.css';

type QuizCardProps = {
  session: QuizSessionHistory;
  onClick: () => void;
};

const QuizCard: React.FC<QuizCardProps> = ({ session, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
    }
  };

  // Handle potential null score
  const score = session.score !== null ? session.score : 'N/A';
  const totalQuestions = session.total_questions ?? 0;
  const scorePercentage =
    session.score !== null && totalQuestions > 0 ? (session.score / totalQuestions) * 100 : 0;

  return (
    <div
      id={`quiz-${session.id}`}
      className={styles.quizCard}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className={styles.quizHeader}>
        <div>
          <Typography variant="h3">Quiz #{session.id}</Typography>
          {/* Use started_at for the date */}
          <time className={styles.quizTime}>
            {session.started_at ? new Date(session.started_at).toLocaleDateString() : 'Date N/A'}
          </time>
        </div>

        <div className={`${styles.difficultyBadge} ${styles[session.difficulty.toLowerCase()]}`}>
          {session.difficulty}
        </div>
      </div>

      <div className={styles.scoreIndicator}>
        <Typography variant="h3" style={{ color: 'var(--color-primary)' }}>
          {totalQuestions > 0 ? `${score}/${totalQuestions}` : `${score}/N/A`}
        </Typography>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreProgress}
            style={{ width: `${scorePercentage}%` }}
            aria-label={`Score progress: ${score} out of 10`}
          />
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
