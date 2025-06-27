import React from 'react';
import styles from './ActivityDetailContent.module.css';
import Typography from '../common/Typography';
import { GroupPlayer } from '../../types/dashboard.types';
import { QuestionDetail } from '../../types/dashboard.types';

interface SessionDetail {
  session_id: number;
  category: string;
  difficulty: string;
  score: number;
  started_at: string;
  is_group_session?: boolean;
  group_players?: GroupPlayer[];
  questions: QuestionDetail[];
}

interface ActivityDetailContentProps {
  sessionDetail: SessionDetail;
}

const ActivityDetailContent: React.FC<ActivityDetailContentProps> = ({ sessionDetail }) => {
  const { category, difficulty, started_at, score, questions, is_group_session, group_players } =
    sessionDetail;

  const getCorrectPlayers = (questionIdx: number, correctAnswer: string): string[] => {
    if (!is_group_session || !group_players?.length) return [];

    const question = questions[questionIdx];
    const questionId = question.id;

    // Use correctPlayer if valid, otherwise check player answers
    if (question.correctPlayer && question.correctPlayer !== 'None') {
      return [question.correctPlayer];
    }

    // First try to use correct_answers field from backend
    const playersFromCorrectAnswers = group_players
      .filter((player) => {
        const isCorrect = player.correct_answers?.[String(questionId)];
        return isCorrect === true;
      })
      .map((player) => player.name);

    if (playersFromCorrectAnswers.length > 0) {
      return playersFromCorrectAnswers;
    }

    // Fallback to checking player answers manually
    const playersFromAnswers = group_players
      .filter((player) => {
        // Find the answer object for this question
        const answerObj = player.answers?.find((ans) => ans.question_id === questionId);
        return answerObj && answerObj.answer === correctAnswer;
      })
      .map((player) => player.name);

    return playersFromAnswers;
  };

  return (
    <div className={styles.container}>
      {/* -------- top bar -------- */}
      <div className={styles.topBar}>
        <Typography variant="h3" className={styles.titleInBar}>
          {is_group_session ? 'Group Quiz' : 'Solo Quiz'} - {category} – {difficulty}
        </Typography>

        <Typography variant="body2" className={styles.dateInBar}>
          {started_at ? new Date(started_at).toLocaleDateString() : 'Date N/A'}
        </Typography>

        {is_group_session && (group_players?.length ?? 0) > 0 && (
          <div className={styles.groupPlayersInBar}>
            <Typography variant="body2">
              Players: {group_players?.map((p) => `${p.name} (${p.score})`).join(', ')}
            </Typography>
          </div>
        )}

        {!is_group_session && (
          <div className={styles.scoreInBar}>
            <Typography variant="body1">
              {score}/{questions.length}
            </Typography>
          </div>
        )}
      </div>

      {/* -------- questions -------- */}
      {questions.length ? (
        questions.map((detail, idx) => {
          const correctPlayers = getCorrectPlayers(idx, detail.correctAnswer);
          const isCorrect = is_group_session
            ? correctPlayers.length > 0
            : detail.userAnswer === detail.correctAnswer;

          return (
            <div
              key={idx}
              className={`${styles.questionDetailItem} ${
                isCorrect ? styles.correct : styles.incorrect
              }`}
            >
              <Typography variant="body2" className={styles.questionText}>
                Question: {detail.question}
              </Typography>

              {is_group_session ? (
                <div className={styles.answersContainer}>
                  <Typography variant="body2">
                    <strong>Correct answer by:</strong>{' '}
                    {detail.correctPlayer ||
                      (correctPlayers.length > 0 ? correctPlayers.join(', ') : 'None')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Correct Answer:</strong> {detail.correctAnswer}
                  </Typography>
                </div>
              ) : (
                <div className={styles.answersContainer}>
                  <div className={styles.answerBlock}>
                    <span className={styles.label}>Your Answer:</span>
                    <span className={styles.answerText}>{detail.userAnswer || 'No Answer'}</span>
                  </div>
                  <div className={`${styles.answerBlock} ${styles.correctAnswerBlock}`}>
                    <span className={styles.label}>Correct Answer:</span>
                    <span className={styles.answerText}>{detail.correctAnswer}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <Typography variant="body1">No question details available.</Typography>
      )}
    </div>
  );
};

export default ActivityDetailContent;
