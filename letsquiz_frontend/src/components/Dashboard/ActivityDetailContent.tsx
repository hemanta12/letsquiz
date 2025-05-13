import React from 'react';
import styles from './ActivityDetailContent.module.css';
import Typography from '../common/Typography';

interface QuestionDetail {
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

interface SessionDetail {
  session_id: number;
  category: string;
  difficulty: string;
  score: number;
  started_at: string;
  questions: QuestionDetail[];
}

interface ActivityDetailContentProps {
  sessionDetail: SessionDetail;
}

const ActivityDetailContent: React.FC<ActivityDetailContentProps> = ({ sessionDetail }) => {
  const { category, difficulty, started_at, score, questions } = sessionDetail;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Typography variant="h3" className={styles.titleInBar}>
          {category} – {difficulty}
        </Typography>
        <Typography variant="body2" className={styles.dateInBar}>
          {started_at ? new Date(started_at).toLocaleDateString() : 'Date N/A'}
        </Typography>
        <div className={styles.scoreInBar}>
          <Typography variant="body1">
            {score}/{questions.length}
          </Typography>
        </div>
      </div>

      {questions.map((detail, idx) => (
        <div
          key={idx}
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
