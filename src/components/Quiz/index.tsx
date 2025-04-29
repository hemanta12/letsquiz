import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal } from '../../components/common';
import { selectUI, setLoading, setError, setModal, setFeedback } from '../../store/slices/uiSlice';
import {
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  initializeQuestions,
  updatePlayerScore,
} from '../../store/slices/quizSlice';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, modals, feedback } = useAppSelector(selectUI);
  const { currentQuestion, questions, selectedAnswers, mode, category, difficulty } =
    useAppSelector((state) => state.quiz);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQuestionData = questions[currentQuestion];

  // Initialize questions if needed
  useEffect(() => {
    if (!questions || questions.length === 0) {
      try {
        dispatch(initializeQuestions(10));
      } catch (err) {
        dispatch(setError('Error initializing questions'));
      }
    }
  }, [dispatch, questions]);

  // Add preloading state tracking
  useEffect(() => {
    const preloadNextQuestion = async () => {
      if (currentQuestion < questions.length - 1) {
        try {
          dispatch(setLoading(true));
          // Preload next question logic here
          dispatch(setLoading(false));
        } catch (err) {
          dispatch(setError('Error preloading next question'));
        }
      }
    };

    if (feedback.show) {
      preloadNextQuestion();
    }
  }, [currentQuestion, questions.length, feedback.show, dispatch]);

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading) {
      try {
        dispatch(setLoading(true));
        await dispatch(selectAnswer({ questionIndex: currentQuestion, answer }));

        const isCorrect = answer === currentQuestionData?.correctAnswer;

        // Update feedback state with animation timing
        dispatch(
          setFeedback({
            show: true,
            isCorrect,
            duration: 1000,
          })
        );

        // Group mode scoring
        if (mode === 'Group' && isCorrect && selectedPlayer) {
          await dispatch(updatePlayerScore(selectedPlayer));
        }
      } catch (err) {
        dispatch(setError('Error selecting answer'));
      } finally {
        dispatch(setLoading(false));
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLButtonElement>, option: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleAnswerSelect(option);
    }
  };

  const handleNext = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setFeedback({ show: false, isCorrect: false }));

      if (currentQuestion === questions.length - 1) {
        await dispatch(updateScore());
        navigate('/results');
      } else {
        await dispatch(nextQuestion());
      }
    } catch (err) {
      dispatch(setError('Error moving to next question'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleQuitConfirm = () => {
    dispatch(resetQuiz());
    dispatch(setModal({ type: 'quitQuiz', isOpen: false }));
    navigate('/');
  };

  if (!currentQuestionData || isLoading) {
    return (
      <div className={styles.quiz}>
        <Loading />
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
      {error && (
        <Typography variant="body2" color="error" className={styles.error}>
          {error}
        </Typography>
      )}

      <div className={styles.header}>
        <Typography variant="body1">
          {mode} - {difficulty} - {category}
        </Typography>
        <Typography variant="body1">
          Question {currentQuestion + 1}/{questions.length}
        </Typography>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {mode === 'Group' ? (
        <GroupQuestionView
          questionNumber={currentQuestion + 1}
          totalQuestions={questions.length}
          question={currentQuestionData.text}
          options={currentQuestionData.options}
          correctAnswer={currentQuestionData.correctAnswer}
          onAnswerSelect={handleAnswerSelect}
          showFeedback={feedback.show}
          selectedAnswer={selectedAnswers[currentQuestion]}
          onPlayerSelected={setSelectedPlayer}
          currentScoredPlayer={selectedPlayer}
        />
      ) : (
        <>
          <div className={styles.question}>
            <Typography variant="h2">{currentQuestionData.text}</Typography>
          </div>

          {feedback.show && (
            <Typography
              variant="h3"
              className={styles.feedback}
              style={{
                color: feedback.isCorrect ? 'var(--color-easy)' : 'var(--color-quit)',
              }}
            >
              {feedback.isCorrect ? 'Correct!' : 'Incorrect!'}
            </Typography>
          )}

          <div className={styles.options}>
            {currentQuestionData.options.map((option) => {
              const isSelected = selectedAnswers[currentQuestion] === option;
              const isCorrectAnswer = option === currentQuestionData.correctAnswer;
              let optionClassNames = styles.option;

              if (feedback.show) {
                if (isSelected) {
                  optionClassNames += ` ${styles.selected}`;
                  if (isCorrectAnswer) {
                    optionClassNames += ` ${styles.correct}`;
                  } else {
                    optionClassNames += ` ${styles.incorrect}`;
                  }
                } else if (isCorrectAnswer) {
                  optionClassNames += ` ${styles.correct}`;
                }
              }

              return (
                <Button
                  key={option}
                  variant="secondary"
                  className={optionClassNames}
                  onClick={() => handleAnswerSelect(option)}
                  onKeyPress={(event) => handleKeyPress(event, option)}
                  disabled={hasSelectedAnswer}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </>
      )}

      <div className={styles.actions}>
        <Button
          variant="quit"
          onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
        >
          Quit
        </Button>
        <Button variant="primary" disabled={!hasSelectedAnswer} onClick={handleNext}>
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </Button>
      </div>

      <Modal
        open={modals.quitQuiz}
        onClose={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
        title="Quit Quiz"
      >
        <div className={styles.quitDialog}>
          <Typography variant="body1">Are you sure you want to quit?</Typography>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
            >
              No
            </Button>
            <Button variant="quit" onClick={handleQuitConfirm}>
              Yes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Quiz;
