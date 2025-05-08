import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Card } from '../../components/common';
import { selectUI, setSharingState, setError } from '../../store/slices/uiSlice';
import { resetQuiz } from '../../store/slices/quizSlice';
import styles from './Results.module.css';

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { sharing } = useAppSelector(selectUI);
  const { score, questions, mode, category, difficulty } = useAppSelector((state) => state.quiz);
  const groupState = useAppSelector((state) => state.quiz.settings.groupState);

  const totalQuestions = questions.length;
  const correctAnswers = score;
  const incorrectAnswers = totalQuestions - score;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Sort players by score for group mode
  const sortedPlayers = groupState?.players
    ? [...groupState.players].sort((a, b) => b.score - a.score)
    : [];

  const handleShare = async () => {
    dispatch(setSharingState({ isSharing: true }));
    try {
      const shareText =
        mode === 'Group'
          ? `Group Quiz Results - ${category} (${difficulty})\n${sortedPlayers.map((p) => `${p.name}: ${p.score} points`).join('\n')}`
          : `I scored ${score}/${totalQuestions} (${percentage}%) on ${category} - ${difficulty} mode!`;

      await navigator.share({
        title: 'My LetsQuiz Result',
        text: shareText,
      });
    } catch (error) {
      dispatch(
        setSharingState({
          isSharing: false,
          error: 'Failed to share. Try again?',
        })
      );
    } finally {
      dispatch(setSharingState({ isSharing: false }));
    }
  };

  const handlePlayAgain = () => {
    dispatch(resetQuiz());
    navigate('/');
  };

  return (
    <motion.div
      className={styles.results}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h2">Quiz Complete!</Typography>

      {mode === 'Solo' ? (
        <>
          <div className={styles.score}>
            <div className={styles.scoreValue}>
              {score}/{totalQuestions}
            </div>
            <Typography variant="h3">{percentage}%</Typography>
          </div>

          <div className={styles.breakdown}>
            <Card className={`${styles.stat} ${styles.correct}`}>
              <Typography variant="h3">{correctAnswers}</Typography>
              <Typography>Correct</Typography>
            </Card>
            <Card className={`${styles.stat} ${styles.incorrect}`}>
              <Typography variant="h3">{incorrectAnswers}</Typography>
              <Typography>Incorrect</Typography>
            </Card>
          </div>
        </>
      ) : (
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
                <div className={styles.playerScore}>{player.score} pts</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="primary" onClick={handlePlayAgain} className={styles.playAgainButton}>
          Play Again
        </Button>
        {typeof navigator.share === 'function' && (
          <Button
            variant="secondary"
            onClick={handleShare}
            disabled={sharing.isSharing}
            className={styles.shareButton}
          >
            {sharing.isSharing ? 'Sharing...' : 'Share Results'}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {sharing.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.error}
          >
            <Typography color="error">{sharing.error}</Typography>
            <Button
              variant="secondary"
              onClick={() => dispatch(setSharingState({ isSharing: false, error: null }))}
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Results;
