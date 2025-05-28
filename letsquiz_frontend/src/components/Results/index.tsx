import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Typography, Modal, Icon } from '../../components/common';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import { clearSelectedDetailedSession } from '../../store/slices/userSlice';
import ActivityDetailContent from '../../components/Dashboard/ActivityDetailContent';
import { GroupPlayer, SessionDetail, QuestionDetail } from '../../types/dashboard.types';
import { Question } from '../../types/api.types';
import styles from './Results.module.css';

interface ResultsComponentProps {
  mode: 'Solo' | 'Group';
  category: string;
  difficulty: string;
  questions: Question[];
  score: number;
  selectedAnswers: string[];
  groupSession?: { players: GroupPlayer[] };
}

const ResultsComponent: React.FC<ResultsComponentProps> = ({
  mode,
  category,
  difficulty,
  questions,
  score,
  selectedAnswers,
  groupSession,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);

  const handlePlayAgain = () => {
    dispatch(resetQuiz());
    navigate('/');
  };

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    dispatch(clearSelectedDetailedSession());
  }, [dispatch]);

  const handleReviewSession = () => {
    const sessionDetail: SessionDetail = {
      session_id: Date.now(),
      category,
      difficulty,
      score,
      started_at: new Date().toISOString(),
      is_group_session: mode === 'Group',
      group_players: groupSession?.players,
      questions: questions.map<QuestionDetail>((q, idx) => ({
        question: q.question_text,
        userAnswer: selectedAnswers[idx] || '',
        correctAnswer: q.correct_answer,
      })),
      totalQuestions,
    };
    setSelectedSession(sessionDetail);
    setShowModal(true);
  };

  const getSoloTitle = (pct: number): string => {
    if (pct === 100) return 'Perfection!';
    if (pct >= 80) return 'Great Job!';
    if (pct >= 60) return 'Nice Work!';
    if (pct >= 30) return 'Keep Going!';
    return "Don't Give Up!";
  };

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
      <Typography variant="h1">Quiz Results</Typography>
      {mode === 'Solo' ? (
        <>
          <div className={styles.scoreCard}>
            <div className={styles.iconPlaceholder} aria-hidden="true">
              <Icon className={styles.trophyIcon} name="trophy" size="large" />
            </div>

            {/* Dynamic title */}
            <Typography variant="h2">{getSoloTitle(percentage)}</Typography>

            {/* Subtext */}
            <Typography variant="caption" className={styles.subtext}>
              You’ve completed the{' '}
              <span className={styles.category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>{' '}
              quiz in
              <span className={styles.difficulty}>
                {' '}
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{' '}
              </span>{' '}
              mode.
            </Typography>

            {/* Stats Grid */}
            <div className={styles.breakdown}>
              <div className={`${styles.stat} ${styles.yourScore}`}>
                <Typography variant="body2">Your Score</Typography>
                <Typography variant="h1">{percentage}%</Typography>
              </div>

              <div className={`${styles.stat} ${styles.correctAnswers}`}>
                <Typography variant="body2">Correct Answers</Typography>
                <Typography variant="h1">
                  {score}/{totalQuestions}
                </Typography>
              </div>
            </div>

            {/* Encouragement banner */}
            <div className={styles.banner}>
              <Typography variant="body1" className={styles.bannerTitle}>
                Keep Learning & Improving!
              </Typography>
              <Typography variant="caption">
                Each quiz is a step forward. Try another category or review your answers.
              </Typography>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              <Button variant="primary" onClick={handlePlayAgain} aria-label="Play again">
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
          </div>
        </>
      ) : (
        <>
          <div className={styles.groupResults}>
            <Typography variant="caption" className={styles.subtext}>
              You’ve completed the{' '}
              <span className={styles.category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>{' '}
              quiz in
              <span className={styles.difficulty}>
                {' '}
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{' '}
              </span>{' '}
              mode.
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
                  <Typography variant="h3" className={styles.playerScore}>
                    {player.score} pts
                  </Typography>
                </div>
              </div>
            ))}
            <div className={styles.actions}>
              <Button variant="primary" onClick={handlePlayAgain}>
                Play Another
              </Button>
              <Button
                variant="secondary"
                onClick={handleReviewSession}
                aria-label="Review your recent quiz session"
              >
                Review your Session
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={showModal} onClose={handleCloseModal}>
        {selectedSession && <ActivityDetailContent sessionDetail={selectedSession} />}
      </Modal>
    </motion.div>
  );
};

export default ResultsComponent;
