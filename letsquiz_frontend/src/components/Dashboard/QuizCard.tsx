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

  // Radial gauge calculations
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(scorePercentage / 100) * circumference} ${circumference}`;

  const renderRadialGauge = () => (
    <div className={styles.radialGauge}>
      <svg className={styles.radialGaugeSvg} viewBox="0 0 60 60">
        <circle className={styles.gaugeBackground} cx="30" cy="30" r={radius} />
        <circle
          className={styles.gaugeForeground}
          cx="30"
          cy="30"
          r={radius}
          strokeDasharray={strokeDasharray}
        />
      </svg>
      <div className={styles.gaugeContent}>
        <div className={styles.gaugeScore}>
          {score}/{totalQuestions}
        </div>
        <div className={styles.gaugePercentage}>{Math.round(scorePercentage)}%</div>
      </div>
    </div>
  );

  return (
    <div
      id={`quiz-${session.id}`}
      className={styles.quizCard}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* First row: Date and Difficulty/Category */}
      <div className={styles.topRow}>
        <time className={styles.quizTime}>
          {session.started_at ? formatDate(session.started_at) : 'Date N/A'}
        </time>
        {isGroupSession ? (
          <div className={styles.badgeGroup}>
            <span className={styles.quizTypeLabel + ' ' + styles.group}>{session.category}</span>
            <span
              className={styles.difficultyBadge + ' ' + styles[session.difficulty.toLowerCase()]}
            >
              {session.difficulty}
            </span>
          </div>
        ) : (
          <span className={styles.difficultyBadge + ' ' + styles[session.difficulty.toLowerCase()]}>
            {session.difficulty}
          </span>
        )}
      </div>

      {/* Second row: Score/Winner */}
      <div className={styles.scoreSection}>
        {!isGroupSession && totalQuestions > 0 && session.score !== null ? (
          renderRadialGauge()
        ) : (
          <Typography
            variant="h3"
            className={displayText.isWinner ? styles.winnerText : styles.scoreText}
          >
            {displayText.text}
          </Typography>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
