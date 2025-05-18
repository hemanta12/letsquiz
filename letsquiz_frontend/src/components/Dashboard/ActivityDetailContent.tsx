import React from 'react';
import styles from './ActivityDetailContent.module.css';
import Typography from '../common/Typography';
import { GroupPlayer } from '../../types/dashboard.types';

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

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Typography variant="h3" className={styles.titleInBar}>
          {is_group_session ? 'Group Quiz' : 'Solo Quiz'} - {category} – {difficulty}
        </Typography>
        <Typography variant="body2" className={styles.dateInBar}>
          {started_at ? new Date(started_at).toLocaleDateString() : 'Date N/A'}
        </Typography>

        {is_group_session && Array.isArray(group_players) && group_players.length > 0 && (
          <div className={styles.groupPlayersInBar}>
            <Typography variant="body2">
              Players:{' '}
              {group_players.map((player) => `${player.name} (${player.score})`).join(', ')}
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

      {is_group_session && Array.isArray(group_players) && group_players.length > 0 && (
        <div className={styles.groupPlayersDetails}>
          <Typography variant="h3">Players</Typography>
          {group_players.map((player) => (
            <div key={player.id} className={styles.playerDetailItem}>
              <Typography variant="body1">
                {player.name} - Score: {player.score}
              </Typography>
              {Array.isArray(player.errors) && player.errors.length > 0 && (
                <div className={styles.playerErrors}>
                  <Typography variant="body2">Errors:</Typography>
                  <ul>
                    {player.errors.map((error, errorIdx) => (
                      <li key={errorIdx}>
                        <Typography variant="body2">{error}</Typography>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {Array.isArray(questions) && questions.length > 0 ? (
        questions.map((detail, idx) => (
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
              {is_group_session ? (
                <div className={`${styles.answerBlock} ${styles.correctAnswerBlock}`}>
                  <span className={styles.label}>Correct Answer:</span>
                  <span className={styles.answerText}>
                    {detail.correctAnswer}
                    {/* Find players who answered correctly */}
                    {group_players &&
                      group_players.length > 0 &&
                      (() => {
                        const correctPlayers = group_players
                          .filter(
                            (player) =>
                              (player as any).answers &&
                              (player as any).answers[idx] === detail.correctAnswer
                          )
                          .map((player) => player.name);
                        return correctPlayers.length > 0
                          ? ` (by ${correctPlayers.join(', ')})`
                          : '';
                      })()}
                  </span>
                </div>
              ) : (
                <div className={`${styles.answerBlock} ${styles.correctAnswerBlock}`}>
                  <span className={styles.label}>Correct Answer:</span>
                  <span className={styles.answerText}>{detail.correctAnswer}</span>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <Typography variant="body1">No question details available.</Typography>
      )}
    </div>
  );
};

export default ActivityDetailContent;
