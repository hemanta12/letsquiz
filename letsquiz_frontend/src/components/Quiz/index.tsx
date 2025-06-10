import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal } from '../../components/common';
import {
  selectUI,
  setLoading,
  setError,
  setModal,
  setFeedback,
  resetUI,
} from '../../store/slices/uiSlice';
import { updateGuestProgress } from '../../store/slices/authSlice';
import { GroupPlayer } from '../../types/quiz.types';
import {
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  fetchQuizQuestions,
  saveQuizSessionThunk,
} from '../../store/slices/quizSlice';
import { updatePlayerScore, resetTempScores } from '../../store/slices/groupQuizSlice';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './QuizComponent.module.css';
import UserService from '../../services/userService';

export const QuizComponent: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { isLoading, error, modals, feedback } = useAppSelector(selectUI);
  const { isGuest, featureGates, user } = useAppSelector((state) => state.auth);
  const {
    settings,
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

  const { groupSession } = useAppSelector((state) => state.groupQuiz);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [migrationState, setMigrationState] = useState<{
    inProgress: boolean;
    progress: number;
    currentStep: string;
  }>({
    inProgress: false,
    progress: 0,
    currentStep: '',
  });

  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex] !== undefined;
  const progress =
    settings.numberOfQuestions > 0
      ? ((currentQuestionIndex + 1) / settings.numberOfQuestions) * 100
      : 0;
  const currentQuestionData = questions[currentQuestionIndex];

  // Monitor migration progress
  useEffect(() => {
    let migrationMonitor: NodeJS.Timeout;
    if (migrationState.inProgress && user && !isGuest) {
      migrationMonitor = setInterval(() => {
        const progress = UserService.getMigrationProgress();
        setMigrationState((prev) => ({
          ...prev,
          progress: (progress.completedSteps / progress.totalSteps) * 100,
          currentStep: progress.currentStep,
        }));

        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(migrationMonitor);
          setMigrationState((prev) => ({ ...prev, inProgress: false }));

          if (progress.status === 'failed' && progress.error) {
            dispatch(setError(`Migration failed: ${progress.error}`));
          }
        }
      }, 500);
    }
    return () => {
      if (migrationMonitor) {
        clearInterval(migrationMonitor);
      }
    };
  }, [migrationState.inProgress, user, isGuest, dispatch]);

  useEffect(() => {
    // Only fetch if we don't have questions and aren't already loading
    if (!questions.length && !quizLoading && !quizError && categoryId && difficulty) {
      dispatch(
        fetchQuizQuestions({
          category: categoryId,
          difficulty,
          count: settings.numberOfQuestions,
        })
      );
    }
  }, [categoryId, difficulty]);

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
        // Validate group mode requirements

        dispatch(setLoading(true));
        dispatch(selectAnswer({ questionIndex: currentQuestionIndex, answer }));

        const isCorrect = answer === currentQuestionData?.correct_answer;

        dispatch(
          setFeedback({
            show: true,
            isCorrect,
            duration: 1000,
          })
        );

        if (isGuest && isCorrect && currentQuestionIndex > 2) {
          dispatch(
            setModal({
              type: 'upgradePrompt',
              isOpen: true,
            })
          );
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

  const cleanupAndNavigate = (path: string) => {
    dispatch(resetQuiz());
    dispatch(resetTempScores());
    dispatch(resetUI());
    dispatch(setFeedback({ show: false, isCorrect: false }));
    setTimeout(() => navigate(path), 0);
  };

  const handleQuitConfirm = () => {
    dispatch(setModal({ type: 'quitQuiz', isOpen: false }));
    cleanupAndNavigate('/');
  };

  const handleNext = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setFeedback({ show: false, isCorrect: false }));

      // Synchronize group state

      if (mode === 'Group' && selectedPlayer) {
        // Update score for the player selected for the previous question
        dispatch(updatePlayerScore({ playerId: Number(selectedPlayer), score: 5 }));
      }

      setSelectedPlayer(null);
      dispatch(resetTempScores());

      if (currentQuestionIndex === settings.numberOfQuestions - 1) {
        const score = Object.entries(selectedAnswers).reduce((total: number, [index, answer]) => {
          const questionIndex = parseInt(index);
          return total + (answer === questions[questionIndex].correct_answer ? 1 : 0);
        }, 0);

        if (isGuest) {
          dispatch(updateGuestProgress({ score }));
        }

        if (mode !== 'Group') {
          await dispatch(updateScore());
        }

        if (!isGuest) {
          const quizSessionData = {
            questions: Object.entries(selectedAnswers).map(([index, selected_answer]) => ({
              id: questions[Number(index)].id,
              selected_answer,
            })),
            score:
              mode === 'Group' && groupSession?.players
                ? groupSession.players.reduce((totalScore, player) => totalScore + player.score, 0)
                : Object.entries(selectedAnswers).reduce((score, [index, answer]) => {
                    const points = answer === questions[Number(index)].correct_answer ? 1 : 0;
                    return score + points;
                  }, 0),
            category_id: categoryId,
            difficulty: difficulty,
          };

          if (mode === 'Group' && groupSession?.players) {
            Object.assign(quizSessionData, {
              is_group_session: true,
              players: groupSession.players.map((player: GroupPlayer) => ({
                name: player.name,
                score: player.score,
                errors: player.errors,
              })),
            });
          }

          const resultAction = await dispatch(saveQuizSessionThunk(quizSessionData));
          if (saveQuizSessionThunk.rejected.match(resultAction)) {
            dispatch(setError('Failed to save quiz session. Your progress might not be recorded.'));
          }
        }

        navigate('/results');
      } else {
        if (isGuest && currentQuestionIndex >= featureGates.maxQuestionsPerQuiz - 1) {
          dispatch(
            setModal({
              type: 'questionLimit',
              isOpen: true,
            })
          );
          return;
        }
        dispatch(nextQuestion());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      dispatch(setError(errorMessage));
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (isLoading || quizLoading) {
    return (
      <div className={styles.quiz}>
        <Loading />
      </div>
    );
  }

  if (error || quizError || !questions || questions.length === 0) {
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          {error || quizError || 'No questions found for the selected criteria.'}
        </Typography>
      </div>
    );
  }

  if (!currentQuestionData || !currentQuestionData.answer_options) {
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          Error: Invalid question format
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
          Question {currentQuestionIndex + 1}/{settings.numberOfQuestions}
        </Typography>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {mode === 'Group' ? (
        <>
          <GroupQuestionView
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={settings.numberOfQuestions}
            question={currentQuestionData.question_text}
            options={currentQuestionData.answer_options}
            correctAnswer={currentQuestionData.correct_answer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={feedback.show}
            selectedAnswer={selectedAnswers[currentQuestionIndex]}
            onPlayerSelected={(playerId) => {
              setSelectedPlayer(playerId);
            }}
            currentScoredPlayer={selectedPlayer}
          />
        </>
      ) : (
        <>
          <div className={styles.question}>
            <Typography variant="h2">{currentQuestionData.question_text}</Typography>
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
            {isLoading ? (
              <Loading variant="skeleton" />
            ) : (
              currentQuestionData.answer_options?.map((option: string) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
                const isCorrectAnswer = option === currentQuestionData.correct_answer;
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
                    key={`${currentQuestionIndex}-${option}`}
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
        </>
      )}

      <div className={styles.actions}>
        <Button
          variant="quit"
          onClick={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
        >
          Quit
        </Button>
        <Button
          variant="primary"
          className={styles.nextOrFinishButton}
          disabled={!hasSelectedAnswer || isLoading || quizLoading}
          onClick={handleNext}
        >
          {currentQuestionIndex === settings.numberOfQuestions - 1
            ? 'Finish Quiz'
            : 'Next Question'}
        </Button>
      </div>

      {/* Quit Quiz Modal */}
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

      {/* Migration Progress Modal */}
      <Modal open={migrationState.inProgress} onClose={() => {}} title="Migrating Your Progress">
        <div className={styles.migrationDialog}>
          <Typography variant="h3">Please wait while we migrate your progress</Typography>
          <Typography variant="body1">{migrationState.currentStep}</Typography>
          <div className={styles.migrationProgress}>
            <div
              className={styles.migrationProgressBar}
              style={{ width: `${migrationState.progress}%` }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuizComponent;
