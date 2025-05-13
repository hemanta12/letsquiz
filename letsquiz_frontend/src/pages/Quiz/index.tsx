import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Typography, Loading, Modal } from '../../components/common';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  selectAnswer,
  updateScore,
  nextQuestion as nextQuestionAction,
  resetQuiz,
  fetchQuizQuestions,
  saveQuizSessionThunk,
} from '../../store/slices/quizSlice';
import { updatePlayerScore } from '../../store/slices/groupQuizSlice';
import { Question } from '../../types/api.types';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';
import QuizService from '../../services/quizService';

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    currentQuestionIndex,
    questions,
    selectedAnswers,
    mode,
    category,
    categoryId,
    difficulty,
    loading: quizLoading,
    error: quizError,
  } = useAppSelector((state) => state.quiz);

  const isGuest = useAppSelector((state) => state.auth.isGuest);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preloadedQuestion, setPreloadedQuestion] = useState<Question | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const preloadNextQuestion = useCallback(async () => {
    if (currentQuestionIndex < questions.length) {
      try {
        const nextQuestionData = await QuizService.fetchQuestions({
          limit: 1,
          category: categoryId,
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
  }, [currentQuestionIndex, questions.length, categoryId, difficulty]);

  useEffect(() => {
    if (questions.length === 0 && !quizLoading && !quizError) {
      dispatch(fetchQuizQuestions({ category: categoryId, difficulty, limit: 4 }));
    }
  }, [dispatch, categoryId, difficulty, questions.length, quizLoading, quizError]);

  useEffect(() => {
    preloadNextQuestion();
  }, [preloadNextQuestion]);

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const currentQuestionData = questions[currentQuestionIndex];
  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex] !== undefined;

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
        setIsLoading(true);
        console.log('[Quiz] Selecting answer:', {
          questionIndex: currentQuestionIndex,
          isGuest,
          questionId: currentQuestionData?.id,
        });

        await dispatch(selectAnswer({ questionIndex: currentQuestionIndex, answer }));

        const correct = answer === currentQuestionData?.correct_answer;
        setIsCorrect(correct);
        setShowFeedback(true);

        console.log('[Quiz] Answer processed:', {
          correct,
          progress: `${currentQuestionIndex + 1}/${questions.length}`,
        });

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
      console.log('[Quiz] Moving to next question:', {
        currentQuestionIndex,
        totalQuestions: questions.length,
        mode,
        isGuest,
      });

      if (mode === 'Group' && selectedPlayer) {
        dispatch(updatePlayerScore({ playerId: Number(selectedPlayer), score: 5 }));
      }

      setShowFeedback(false);
      setSelectedPlayer(null);

      // Check if the current question is the last one (index 9 for 10 questions)
      if (currentQuestionIndex === 9) {
        console.log('[Quiz] Completing quiz:', {
          totalQuestions: questions.length,
          answeredQuestions: Object.keys(selectedAnswers).length,
        });
        await dispatch(updateScore());

        // Save quiz session for logged-in users
        if (!isGuest) {
          const quizSessionData = {
            questions: Object.entries(selectedAnswers).map(([index, selected_answer]) => ({
              id: questions[Number(index)].id,
              selected_answer,
            })),
            score: Object.entries(selectedAnswers).reduce((score, [index, answer]) => {
              const points = answer === questions[Number(index)].correct_answer ? 1 : 0;
              return score + points;
            }, 0),
            category_id: categoryId,
            difficulty: difficulty,
          };
          const resultAction = await dispatch(saveQuizSessionThunk(quizSessionData));
          if (saveQuizSessionThunk.rejected.match(resultAction)) {
            console.error('Error saving quiz session:', resultAction.payload);
          }
        }

        navigate('/results');
      } else {
        // Move to the next question
        dispatch(nextQuestionAction());
        await preloadNextQuestion();
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

  if (isLoading || quizLoading) {
    return (
      <div className={styles.quiz}>
        <Loading />
      </div>
    );
  }

  // Handle case where no questions are available after loading
  if (!quizLoading && questions.length === 0) {
    return (
      <div className={styles.quiz}>
        <Typography variant="h3">
          Sorry, no quiz data available for this category and difficulty.
        </Typography>
      </div>
    );
  }

  // Display error if either local error or quiz slice error exists
  if (error || quizError) {
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          {error || quizError || 'An unexpected error occurred'}
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
          Question {currentQuestionIndex + 1}/{questions.length}
        </Typography>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {mode === 'Group' ? (
        <>
          <GroupQuestionView
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            question={currentQuestionData.question_text}
            options={currentQuestionData.answer_options}
            correctAnswer={currentQuestionData.correct_answer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={showFeedback}
            selectedAnswer={selectedAnswers[currentQuestionIndex]}
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
              {currentQuestionIndex === 9 ? 'Finish Quiz' : 'Next Question'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.question}>
            <Typography variant="h2">{currentQuestionData?.question_text}</Typography>{' '}
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
              currentQuestionData?.answer_options?.map((option: string) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
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
              {currentQuestionIndex === 9 ? 'Finish Quiz' : 'Next Question'}
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

export default function QuizWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Quiz />
    </ErrorBoundary>
  );
}
