import React from 'react';
import styles from './ActivityDetailContent.module.css';
import { QuizSession } from '../../types/dashboard.types';
import Typography from '../common/Typography';

interface ActivityDetailContentProps {
  quizHistory: QuizSession[] | null;
  sessionId: number | null;
}

const ActivityDetailContent: React.FC<ActivityDetailContentProps> = ({
  quizHistory,
  sessionId,
}) => {
  const activity = quizHistory?.find((session) => session.id === sessionId);

  if (!activity) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Typography variant="h3" className={styles.titleInBar}>
          {activity.category} - {activity.difficulty}
        </Typography>
        <Typography variant="body2" className={styles.dateInBar}>
          {activity.started_at ? new Date(activity.started_at).toLocaleDateString() : 'Date N/A'}
        </Typography>
        <div className={styles.scoreInBar}>
          <Typography variant="body1">
            {activity.score}/{activity.details?.length || 0}
          </Typography>
        </div>
      </div>
      {/* Display quiz details */}
      {activity.details?.map((detail, index) => (
        <div
          key={index}
          className={`${styles.questionDetailItem} ${
            detail.userAnswer === detail.correctAnswer ? styles.correct : styles.incorrect
          }`}
        >
          <Typography variant="body2" className={styles.questionText}>
            Question: {detail.question}
          </Typography>
          <div className={styles.answersContainer}>
            <div className={styles.answerBlock}>
              <span className={styles.label}>Your Answer:</span>
              <span className={styles.answerText}>{detail.userAnswer}</span>
            </div>
            <div className={`${styles.answerBlock} ${styles.correctAnswerBlock}`}>
              <span className={styles.label}>Correct Answer:</span>
              <span className={styles.answerText}>{detail.correctAnswer}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityDetailContent;
