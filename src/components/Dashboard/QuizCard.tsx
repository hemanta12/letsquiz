import React from 'react';
import { Typography } from '../common';
import { QuizSession } from '../../types/dashboard.types';
import styles from './QuizCard.module.css';

type QuizCardProps = {
  session: QuizSession;
  isExpanded: boolean;
  onToggle: () => void;
};

const QuizCard: React.FC<QuizCardProps> = ({ session, isExpanded, onToggle }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  const scorePercentage = (session.score / 10) * 100;

  return (
    <div
      id={`quiz-${session.id}`}
      className={`${styles.quizCard} ${isExpanded ? styles.expanded : ''}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      <div className={styles.quizHeader}>
        <div>
          <Typography variant="h3">Quiz #{session.id}</Typography>
          <time className={styles.quizTime}>{new Date(session.time).toLocaleDateString()}</time>
        </div>
        <div className={`${styles.difficultyBadge} ${styles[session.level.toLowerCase()]}`}>
          {session.level}
        </div>
      </div>

      <div className={styles.scoreIndicator}>
        <Typography variant="h3" style={{ color: 'var(--color-primary)' }}>
          {session.score}/10
        </Typography>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreProgress}
            style={{ width: `${scorePercentage}%` }}
            aria-label={`Score progress: ${session.score} out of 10`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className={styles.quizDetails} role="region" aria-label="Question details">
          <Typography variant="h3">Questions & Answers</Typography>
          <div className={styles.questionList}>
            {session.details.map((detail, index) => (
              <div key={index} className={styles.question}>
                <Typography variant="body1">
                  Q{index + 1}: {detail.question}
                </Typography>
                <div className={styles.answer}>
                  <Typography
                    variant="body2"
                    className={
                      detail.userAnswer === detail.correctAnswer
                        ? styles.correctAnswer
                        : styles.wrongAnswer
                    }
                  >
                    Your Answer: {detail.userAnswer}
                  </Typography>
                  <Typography variant="body2" className={styles.correctAnswer}>
                    Correct: {detail.correctAnswer}
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizCard;
