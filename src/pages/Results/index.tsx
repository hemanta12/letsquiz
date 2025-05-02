import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Typography, Card } from '../../components/common';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import styles from './Results.module.css';
import apiClient from '../../services/apiClient';

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { score, questions, mode, category, difficulty } = useAppSelector((state) => state.quiz);
  const groupState = useAppSelector((state) => state.quiz.settings.groupState);

  const totalQuestions = questions.length;
  const correctAnswers = score;
  const incorrectAnswers = totalQuestions - score;
  const percentage = Math.round((score / totalQuestions) * 100);

  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isPostingToLeaderboard, setIsPostingToLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const handleShare = async () => {
    setIsSharing(true);
    setShareError(null);
    try {
      await navigator.share({
        title: 'My LetsQuiz Result',
        text: `I scored ${score}/${totalQuestions} (${percentage}%) on ${category} - ${difficulty} mode!`,
      });
    } catch (error) {
      setShareError('Failed to share. Try again?');
    } finally {
      setIsSharing(false);
    }
  };

  const handlePostToLeaderboard = async () => {
    setIsPostingToLeaderboard(true);
    setLeaderboardError(null);
    try {
      await apiClient.post('/leaderboard', {
        category,
        difficulty,
        players: sortedPlayers.map((player) => ({ name: player.name, score: player.score })),
      });
      // Optionally show a success message
    } catch (error) {
      console.error('Error posting to leaderboard:', error);
      // Do not set error state, allow user to see results
    } finally {
      setIsPostingToLeaderboard(false);
    }
  };

  const handlePlayAgain = () => {
    dispatch(resetQuiz());
    navigate('/');
  };

  // Create a sorted copy of players array
  const sortedPlayers = groupState?.players
    ? [...groupState.players].sort((a, b) => b.score - a.score)
    : [];

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
            <Typography variant="h2">Quiz Complete!</Typography>
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

          <div className={styles.actions}>
            {typeof navigator.share === 'function' && (
              <Button variant="primary" onClick={handleShare} disabled={isSharing}>
                Share Results
              </Button>
            )}
            <Button variant="secondary" onClick={handlePlayAgain}>
              Play Again
            </Button>
          </div>

          <AnimatePresence>
            {shareError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Typography color="error">{shareError}</Typography>
                <Button variant="secondary" onClick={() => setShareError(null)}>
                  Dismiss
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
            {mode === 'Group' && (
              <Button
                variant="secondary"
                onClick={handlePostToLeaderboard}
                disabled={isPostingToLeaderboard}
              >
                {isPostingToLeaderboard ? 'Posting...' : 'Post to Leaderboard'}
              </Button>
            )}
            {typeof navigator.share === 'function' && (
              <Button variant="secondary" onClick={handleShare}>
                Share Results
              </Button>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Results;
