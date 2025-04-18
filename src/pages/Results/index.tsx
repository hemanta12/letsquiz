import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Typography, Card } from '../../components/common';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import styles from './Results.module.css';

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { score, questions, selectedAnswers, mode, category, difficulty } = useAppSelector(
    (state) => state.quiz
  );

  const totalQuestions = questions.length;
  const correctAnswers = score;
  const incorrectAnswers = totalQuestions - score;
  const percentage = Math.round((score / totalQuestions) * 100);

  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
    </motion.div>
  );
};

export default Results;
