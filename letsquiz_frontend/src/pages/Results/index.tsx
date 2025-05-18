import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Typography, Modal } from '../../components/common';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import CircularProgressBar from '../../components/Results/CircularProgressBar';
import { resetQuiz } from '../../store/slices/quizSlice';
import {
  fetchSingleDetailedQuizSession,
  clearSelectedDetailedSession,
} from '../../store/slices/userSlice';
import styles from './Results.module.css';
import { SessionDetail } from '../../types/dashboard.types';
import { Question } from '../../types/api.types';
import ActivityDetailContent from '../../components/Dashboard/ActivityDetailContent';

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mode, category, difficulty, questions, score, selectedAnswers } = useAppSelector(
    (state) => state.quiz
  );
  const groupSession = useAppSelector((state) => state.groupQuiz.groupSession);

  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  const [showModal, setShowModal] = useState(false);

  const handlePlayAgain = () => {
    dispatch(resetQuiz());
    navigate('/');
  };
  const sessionDetailForReview: SessionDetail = {
    session_id: Date.now(), // Temporary unique ID
    category,
    difficulty,
    score,
    started_at: new Date().toISOString(),
    is_group_session: mode === 'Group',
    group_players: groupSession?.players || [],
    questions: questions.map((q: Question, index: number) => ({
      question: q.question_text || '',
      userAnswer: selectedAnswers[index] || '',
      correctAnswer: q.correct_answer || '',
    })),
  };

  const handleReviewSession = useCallback(() => {
    dispatch(fetchSingleDetailedQuizSession(sessionDetailForReview.session_id));
    setShowModal(true);
  }, [dispatch, sessionDetailForReview.session_id]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    dispatch(clearSelectedDetailedSession());
  }, [dispatch]);

  const sortedPlayers = groupSession?.players
    ? [...groupSession.players].sort((a, b) => b.score - a.score)
    : [];

  return (
    <motion.div
      className={styles.results}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {mode === 'Solo' ? (
        <>
          <div className={styles.score}>
            <Typography variant="h2">Quiz Complete!</Typography>
            <CircularProgressBar
              score={score}
              totalQuestions={totalQuestions}
              percentage={percentage}
            />
          </div>

          <div className={styles.actions}>
            <Button variant="primary" onClick={handlePlayAgain}>
              Play Again
            </Button>
            <Button
              variant="secondary"
              onClick={handleReviewSession}
              aria-label="Review your recent quiz session"
            >
              Review your Session
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.groupResults}>
            <Typography variant="h3" className={styles.categoryInfo}>
              {category} - {difficulty}
            </Typography>

            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`${styles.playerResult} ${index === 0 ? styles.winner : styles.runnerUp}`}
              >
                <div
                  className={`${styles.positionNumber} ${
                    index < 3 ? styles[`position-${index + 1}`] : styles['position-other']
                  }`}
                >
                  {index + 1}
                </div>
                {index === 0 && <div className={styles.winnerLabel}>Winner!</div>}
                <div className={styles.playerInfo}>
                  <Typography variant="h3" className={styles.playerName}>
                    {player.name}
                  </Typography>
                  <Typography variant="h3" className={`${styles.playerScore} ${styles.correct}`}>
                    {player.score} points
                  </Typography>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <Button variant="primary" onClick={handlePlayAgain}>
              Play Again
            </Button>
            <Button
              variant="secondary"
              onClick={handleReviewSession}
              aria-label="Review your recent quiz session"
            >
              Review your Session
            </Button>
          </div>
        </>
      )}

      <Modal open={showModal} onClose={handleCloseModal}>
        <ActivityDetailContent sessionDetail={sessionDetailForReview} />
      </Modal>
    </motion.div>
  );
};

export default Results;
