import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Typography, Loading, Modal } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  selectAnswer,
  updateScore,
  nextQuestion as nextQuestionAction,
  Question,
  initializeQuestions,
  resetQuiz,
  updatePlayerScore,
} from '../../store/slices/quizSlice';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentQuestion, questions, selectedAnswers, mode, category, difficulty } =
    useAppSelector((state) => state.quiz);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloadedQuestion, setPreloadedQuestion] = useState<Question | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  // Redirect if no questions are loaded
  useEffect(() => {
    if (!questions || questions.length === 0) {
      try {
        dispatch(initializeQuestions(10)); // Default to 10 questions for now
      } catch (err) {
        setError('Error initializing questions');
        console.error('Error:', err);
      }
    }
  }, [dispatch, questions]);

  const preloadNextQuestion = useCallback(async () => {
    if (currentQuestion < questions.length - 1) {
      try {
        const nextQuestionData = questions[currentQuestion + 1];
        if (nextQuestionData) {
          setPreloadedQuestion(nextQuestionData);
        }
      } catch (error) {
        setError('Error preloading next question');
        console.error('Error:', error);
      }
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    preloadNextQuestion();
  }, [preloadNextQuestion]);

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const currentQuestionData = questions[currentQuestion];
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading) {
      try {
        setIsLoading(true);
        await dispatch(selectAnswer({ questionIndex: currentQuestion, answer }));

        // Show feedback
        const correct = answer === currentQuestionData?.correctAnswer;
        setIsCorrect(correct);
        setShowFeedback(true);

        await preloadNextQuestion();
      } catch (err) {
        setError('Error selecting answer');
      } finally {
        setIsLoading(false);
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
      setIsLoading(true);

      // Update score before moving to next question if in group mode
      if (mode === 'Group' && selectedPlayer) {
        dispatch(updatePlayerScore(selectedPlayer));
      }

      setShowFeedback(false);
      setSelectedPlayer(null);

      if (currentQuestion === questions.length - 1) {
        await dispatch(updateScore());
        navigate('/results');
      } else {
        await dispatch(nextQuestionAction());
      }
    } catch (err) {
      setError('Error moving to next question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuit = () => {
    dispatch(resetQuiz());
    navigate('/');
  };

  if (!currentQuestionData) {
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
        <>
          <GroupQuestionView
            questionNumber={currentQuestion + 1}
            totalQuestions={questions.length}
            question={currentQuestionData.text}
            options={currentQuestionData.options}
            correctAnswer={currentQuestionData.correctAnswer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={showFeedback}
            selectedAnswer={selectedAnswers[currentQuestion]}
            onPlayerSelected={setSelectedPlayer}
            currentScoredPlayer={selectedPlayer}
          />
          <div className={styles.actions}>
            <Button
              variant="quit"
              className={styles.quitButton}
              onClick={() => setShowQuitModal(true)}
            >
              Quit
            </Button>
            <Button variant="primary" disabled={!hasSelectedAnswer} onClick={handleNext}>
              {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.question}>
            <Typography variant="h2">{currentQuestionData?.text}</Typography>
          </div>

          {showFeedback && (
            <Typography
              variant="h3"
              className={styles.feedback}
              style={{ color: isCorrect ? 'var(--color-easy)' : 'var(--color-quit)' }}
            >
              {isCorrect ? 'Correct!' : 'Incorrect!'}
            </Typography>
          )}

          <div className={styles.options}>
            {isLoading ? (
              <Loading variant="skeleton" />
            ) : (
              currentQuestionData?.options.map((option) => {
                const isSelected = selectedAnswers[currentQuestion] === option;
                const isCorrectAnswer = option === currentQuestionData.correctAnswer;
                const showFeedbackStyles = showFeedback && (isSelected || isCorrectAnswer);

                let optionClassNames = styles.option;

                if (showFeedback) {
                  if (isSelected) {
                    optionClassNames += ` ${styles.selected}`;
                    if (isCorrectAnswer) {
                      optionClassNames += ` ${styles.correct}`;
                    } else {
                      optionClassNames += ` ${styles.incorrect}`;
                    }
                  } else if (isCorrectAnswer) {
                    optionClassNames += ` ${styles.correct}`;
                  } else {
                    optionClassNames += ` ${styles.wrong}`;
                  }
                }

                return (
                  <Button
                    key={option}
                    variant="secondary"
                    className={optionClassNames}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={hasSelectedAnswer}
                    onKeyPress={(e) => handleKeyPress(e, option)}
                    tabIndex={0}
                    aria-selected={isSelected}
                  >
                    {option}
                  </Button>
                );
              })
            )}
          </div>

          <div className={styles.actions}>
            <Button
              variant="quit"
              className={styles.quitButton}
              onClick={() => setShowQuitModal(true)}
            >
              Quit
            </Button>
            <Button variant="primary" disabled={!hasSelectedAnswer} onClick={handleNext}>
              {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </div>
        </>
      )}

      <Modal open={showQuitModal} onClose={() => setShowQuitModal(false)} title="Quit Quiz">
        <div className={styles.quitDialog}>
          <Typography variant="body1">Are you sure you want to quit?</Typography>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowQuitModal(false)}>
              No
            </Button>
            <Button variant="quit" onClick={handleQuit}>
              Yes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Quiz;
