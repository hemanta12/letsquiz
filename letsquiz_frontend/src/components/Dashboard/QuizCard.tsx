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
  console.log('Difficulty', session.difficulty);
  // Handle potential null score
  const score = session.score !== null ? session.score : 'N/A';
  const totalQuestions = session.total_questions ?? 0;
  const scorePercentage =
    session.score !== null && totalQuestions > 0 ? (session.score / totalQuestions) * 100 : 0;

  const displayText = getWinnerDisplay(session);
  const isGroupSession = session.is_group_session;

  function toCamelCase(str: string) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word, i) => (i === 0 ? word : word[0].toUpperCase() + word.slice(1)))
      .join('');
  }
  const difficultyClass = toCamelCase(session.difficulty);
  console.log('difficultyClass', difficultyClass);

  // Radial gauge calculations
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(scorePercentage / 100) * circumference} ${circumference}`;

  const renderRadialGaugeSolo = () => (
    <div className={styles.radialGaugeSoloCol}>
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
      <div className={styles.gaugeContentSolo}>{Math.round(scorePercentage)}%</div>
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
      {/* Two-column layout for solo mode */}
      {!isGroupSession && totalQuestions > 0 && session.score !== null ? (
        <div className={styles.soloRowLayout}>
          <div className={styles.soloLeftCol}>
            <time className={styles.quizTime}>
              {session.started_at ? formatDate(session.started_at) : 'Date N/A'}
            </time>
            <div className={styles.soloScore}>
              {score}/{totalQuestions}
            </div>
            <span className={styles.difficultyBadge + ' ' + styles[difficultyClass]}>
              {session.difficulty}
            </span>
          </div>
          <div className={styles.soloRightCol}>{renderRadialGaugeSolo()}</div>
        </div>
      ) : (
        <>
          {/* Existing group mode layout */}
          <div className={styles.topRow}>
            <time className={styles.quizTime}>
              {session.started_at ? formatDate(session.started_at) : 'Date N/A'}
            </time>
            {isGroupSession ? (
              <div className={styles.badgeGroup}>
                <span className={styles.quizTypeLabel + ' ' + styles.group}>
                  {session.category}
                </span>
                <span className={styles.difficultyBadge + ' ' + styles[difficultyClass]}>
                  {session.difficulty}
                </span>
              </div>
            ) : (
              <span className={styles.difficultyBadge + ' ' + styles[difficultyClass]}>
                {session.difficulty}
              </span>
            )}
          </div>
          <div className={styles.scoreSection}>
            <div className={styles.scoreWinnerBlock}>
              <Typography
                variant="h3"
                className={displayText.isWinner ? styles.winnerText : styles.scoreText}
              >
                {displayText.text}
              </Typography>
              {isGroupSession && session.group_players && session.group_players.length > 0 && (
                <Typography variant="caption" className={styles.groupPlayers}>
                  Players: {session.group_players.map((p: { name: string }) => p.name).join(', ')}
                </Typography>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizCard;
