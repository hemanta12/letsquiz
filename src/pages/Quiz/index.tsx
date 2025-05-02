import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Typography, Loading, Modal } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  selectAnswer,
  updateScore,
  nextQuestion as nextQuestionAction,
  resetQuiz,
  updatePlayerScore,
} from '../../store/slices/quizSlice';
import { Question } from '../../types/api.types';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';
import QuizService from '../../services/quizService';

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    currentQuestion,
    questions,
    selectedAnswers,
    mode,
    category,
    difficulty,
    loading: quizLoading,
    error: quizError,
  } = useAppSelector((state) => state.quiz);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloadedQuestion, setPreloadedQuestion] = useState<Question | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const preloadNextQuestion = useCallback(async () => {
    // Only preload if there are more questions to fetch from the API
    if (currentQuestion < questions.length) {
      try {
        // Assuming fetchQuestions fetches one question at a time for preloading
        const nextQuestionData = await QuizService.fetchQuestions({
          limit: 1,
          category: category,
          difficulty: difficulty,
        });
        if (nextQuestionData && nextQuestionData.questions.length > 0) {
          setPreloadedQuestion(nextQuestionData.questions[0]);
        }
      } catch (error) {
        setError('Error preloading next question');
        console.error('Error:', error);
      }
    }
  }, [currentQuestion, questions.length, category, difficulty]);

  useEffect(() => {
    preloadNextQuestion();
  }, [preloadNextQuestion]);

  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const currentQuestionData = questions[currentQuestion];
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
        setIsLoading(true);
        await dispatch(selectAnswer({ questionIndex: currentQuestion, answer }));

        // Show feedback
        const correct = answer === currentQuestionData?.correct_answer;
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
        // Use the preloaded question if available, otherwise fetch the next question
        if (preloadedQuestion) {
          dispatch(nextQuestionAction(preloadedQuestion));
          setPreloadedQuestion(null); // Clear preloaded question after using it
        } else {
          // Fallback: Fetch the next question if not preloaded
          // This case should ideally not be hit if preloading works correctly
          // but is included for robustness.
          const nextQuestionData = await QuizService.fetchQuestions({
            limit: 1,
            category: category,
            difficulty: difficulty,
          });
          if (nextQuestionData && nextQuestionData.questions.length > 0) {
            dispatch(nextQuestionAction(nextQuestionData.questions[0]));
          } else {
            // Handle case where no more questions are available from API
            await dispatch(updateScore());
            navigate('/results');
          }
        }
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

  // Show loading if either local loading or quiz slice loading is true, or if no questions are loaded yet
  if (isLoading || quizLoading || !currentQuestionData) {
    // Fallback for group mode when no questions are available
    if (mode === 'Group' && questions.length === 0) {
      return (
        <div className={styles.quiz}>
          <Typography variant="h3">No quiz data available for this mode.</Typography>
        </div>
      );
    }
    return (
      <div className={styles.quiz}>
        <Loading />
      </div>
    );
  }

  // Display error if either local error or quiz slice error exists
  if (error || quizError) {
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          {error || quizError}
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.quiz}>
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
            question={currentQuestionData.question_text}
            options={currentQuestionData.answer_options}
            correctAnswer={currentQuestionData.correct_answer}
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
            <Typography variant="h2">{currentQuestionData?.question_text}</Typography>{' '}
            {/* Use question_text */}
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
              currentQuestionData?.answer_options.map((option: string) => {
                // Use answer_options and explicitly type option
                const isSelected = selectedAnswers[currentQuestion] === option;
                const isCorrectAnswer = option === currentQuestionData.correct_answer;
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
                    disabled={hasSelectedAnswer || isLoading || quizLoading}
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
            <Button
              variant="primary"
              disabled={!hasSelectedAnswer || isLoading || quizLoading}
              onClick={handleNext}
            >
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
