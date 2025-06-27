import React from 'react';
import { Typography } from '../common';
import { QuizSessionHistory } from '../../types/api.types';
import styles from './QuizCard.module.css';
import { getWinnerDisplay, formatDate } from '../../utils/activityUtils';

type QuizCardProps = {
  session: QuizSessionHistory;
  onClick: () => void;
};

const QuizCard: React.FC<QuizCardProps> = ({ session, onClick }) => {
  // Handles both click and keyboard activation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  // Handle potential null score
  const score = session.score !== null ? session.score : 'N/A';
  const totalQuestions = session.total_questions ?? 0;
  const scorePercentage =
    session.score !== null && totalQuestions > 0 ? (session.score / totalQuestions) * 100 : 0;

  const displayText = getWinnerDisplay(session);
  const isGroupSession = session.is_group_session;

  return (
    <div
      id={`quiz-${session.id}`}
      className={styles.quizCard}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      // Optionally, add aria-pressed or other ARIA props if needed
    >
      <div className={styles.quizHeader}>
        <div>
          <Typography variant="h3">Quiz #{session.id}</Typography>
          {/* Use started_at for the date, formatted consistently */}
          <time className={styles.quizTime}>
            {session.started_at ? formatDate(session.started_at) : 'Date N/A'}
          </time>
        </div>
        <div className={styles.quizHeaderRight}>
          <span className={styles.difficultyBadge + ' ' + styles[session.difficulty.toLowerCase()]}>
            {' '}
            {session.difficulty}
          </span>
          <span
            className={styles.quizTypeLabel + ' ' + (isGroupSession ? styles.group : styles.solo)}
            style={{ marginLeft: 8 }}
          >
            {isGroupSession ? 'Group' : 'Solo'}
          </span>
        </div>
      </div>

      <div className={styles.scoreIndicator}>
        <Typography
          variant="body1"
          className={displayText.isWinner ? styles.winnerText : ''}
          style={{ color: 'var(--color-primary)' }}
        >
          {/* Show percentage for solo mode */}
          {!isGroupSession && totalQuestions > 0 && session.score !== null
            ? `${score} / ${totalQuestions} (${Math.round(scorePercentage)}%)`
            : displayText.text}
        </Typography>
        {/* Progress bar removed as per new requirement */}
      </div>
    </div>
  );
};

export default QuizCard;
