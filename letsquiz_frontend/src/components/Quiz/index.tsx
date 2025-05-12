import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal, Card } from '../../components/common';
import { selectUI, setLoading, setError, setModal, setFeedback } from '../../store/slices/uiSlice';
import { updateGuestProgress } from '../../store/slices/authSlice';
import { GroupPlayer } from '../../types/quiz.types';
import {
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  fetchQuizQuestions,
} from '../../store/slices/quizSlice';
import { updatePlayerScore, resetTempScores } from '../../store/slices/groupQuizSlice';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './Quiz.module.css';
import QuizService from '../../services/quizService';
import UserService from '../../services/userService';
import { Question } from '../../types/api.types';

export const Quiz: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, modals, feedback } = useAppSelector(selectUI);
  const { isGuest, featureGates, user } = useAppSelector((state) => state.auth);
  const {
    currentQuestionIndex,
    selectedAnswers,
    mode,
    category,
    categoryId,
    difficulty,
    isMixedMode,
    error: quizError,
  } = useAppSelector((state) => state.quiz);

  const quizLoading = useAppSelector((state) => state.quiz.loading);
  const questions = useAppSelector((state) => state.quiz.questions);
  const groupSession = useAppSelector((state) => state.groupQuiz.groupSession);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [preloadedQuestion, setPreloadedQuestion] = useState<Question | null>(null);
  const [groupValidation, setGroupValidation] = useState({
    isValid: true,
    message: '',
  });
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
    questions?.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const currentQuestionData = questions?.[currentQuestionIndex];

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
    if ((!questions || !questions.length) && !quizLoading) {
      if (((categoryId !== undefined && categoryId !== null) || isMixedMode) && difficulty) {
        dispatch(setLoading(true));
        dispatch(fetchQuizQuestions({ category: categoryId, difficulty })).finally(() => {
          dispatch(setLoading(false));
        });
      }
    }
  }, [dispatch, categoryId, difficulty, questions, quizLoading, isMixedMode]);

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
    preloadNextQuestion();
  }, [preloadNextQuestion]);

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
        // Validate group mode requirements
        if (mode === 'Group') {
          if (!selectedPlayer) {
            setGroupValidation({
              isValid: false,
              message: 'Please select a player before answering',
            });
            return;
          }
          if (!groupSession) {
            setGroupValidation({
              isValid: false,
              message: 'Invalid group session',
            });
            return;
          }
        }

        dispatch(setLoading(true));
        dispatch(selectAnswer({ questionIndex: currentQuestionIndex, answer }));

        const isCorrect = answer === currentQuestionData?.correct_answer;

        // Handle group mode scoring
        if (mode === 'Group' && isCorrect && selectedPlayer) {
          if (groupSession && groupSession.players) {
            await QuizService.updateGroupSession(groupSession.id, {
              players: groupSession.players.map((p: GroupPlayer) =>
                p.id === Number(selectedPlayer) ? { ...p, score: p.score + 5 } : p
              ),
            });
          }
        }

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

  const handleNext = async () => {
    try {
      dispatch(setLoading(true));
      dispatch(setFeedback({ show: false, isCorrect: false }));

      // Synchronize group state
      if (mode === 'Group' && groupSession) {
        await QuizService.updateGroupSession(groupSession!.id, {
          currentQuestion: currentQuestionIndex + 1,
          status: currentQuestionIndex === questions.length - 1 ? 'completed' : 'active',
          currentPlayer:
            groupSession.players[
              (groupSession.players.findIndex((p) => p.id === Number(selectedPlayer)) + 1) %
                groupSession.players.length
            ].id,
        });
      }

      setSelectedPlayer(null);
      dispatch(resetTempScores());

      if (currentQuestionIndex === questions.length - 1) {
        const score = Object.entries(selectedAnswers).reduce((total: number, [index, answer]) => {
          const questionIndex = parseInt(index);
          return total + (answer === questions[questionIndex].correct_answer ? 1 : 0);
        }, 0);

        if (isGuest) {
          dispatch(updateGuestProgress({ score }));
        }

        await dispatch(updateScore());
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

  const handleUpgradeStart = async () => {
    if (user && 'id' in user && !isGuest) {
      setMigrationState({
        inProgress: true,
        progress: 0,
        currentStep: 'Initializing migration',
      });
      try {
        await UserService.transferGuestData(String(user.id));
      } catch (error) {
        console.error('Migration error:', error);
      }
    }
    dispatch(setModal({ type: 'upgradePrompt', isOpen: false }));
    navigate('/signup');
  };

  if (isLoading || quizLoading) {
    return (
      <div className={styles.quiz}>
        <Loading />
      </div>
    );
  }

  if (quizError || !questions || questions.length === 0) {
    return (
      <div className={styles.quiz}>
        <Typography variant="body2" color="error" className={styles.error}>
          {quizError || 'No questions found for the selected criteria.'}
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
          Question {currentQuestionIndex + 1}/{questions.length}
        </Typography>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {mode === 'Group' ? (
        <>
          {!groupValidation.isValid && (
            <Typography variant="body2" color="error" className={styles.error}>
              {groupValidation.message}
            </Typography>
          )}
          <GroupQuestionView
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            question={currentQuestionData.question_text}
            options={currentQuestionData.answer_options}
            correctAnswer={currentQuestionData.correct_answer}
            onAnswerSelect={handleAnswerSelect}
            showFeedback={feedback.show}
            selectedAnswer={selectedAnswers[currentQuestionIndex]}
            onPlayerSelected={(playerId) => {
              setSelectedPlayer(playerId);
              setGroupValidation({ isValid: true, message: '' });
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
            {currentQuestionData.answer_options?.map((option: string) => {
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
        <Button
          variant="primary"
          disabled={!hasSelectedAnswer || isLoading || quizLoading}
          onClick={handleNext}
        >
          {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
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

      {/* Upgrade Prompt Modal */}
      <Modal
        open={modals.upgradePrompt}
        onClose={() => dispatch(setModal({ type: 'upgradePrompt', isOpen: false }))}
        title="Great Progress!"
      >
        <div className={styles.upgradeDialog}>
          <Typography variant="h3">You're doing great!</Typography>
          <Typography variant="body1">
            Upgrade to Premium to unlock unlimited questions, save your progress, and access premium
            content!
          </Typography>
          <div className={styles.modalActions}>
            <Button variant="primary" onClick={handleUpgradeStart}>
              Upgrade Now
            </Button>
            <Button
              variant="secondary"
              onClick={() => dispatch(setModal({ type: 'upgradePrompt', isOpen: false }))}
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </Modal>

      {/* Question Limit Modal */}
      <Modal
        open={modals.questionLimit}
        onClose={() => dispatch(setModal({ type: 'questionLimit', isOpen: false }))}
        title="Question Limit Reached"
      >
        <div className={styles.upgradeDialog}>
          <Typography variant="h3">Question Limit Reached</Typography>
          <Typography variant="body1">
            You've reached the question limit for guest users. Upgrade to Premium to: • Access
            unlimited questions • Save your progress • Get personalized recommendations
          </Typography>
          <div className={styles.modalActions}>
            <Button variant="primary" onClick={handleUpgradeStart}>
              Upgrade Now
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                dispatch(setModal({ type: 'questionLimit', isOpen: false }));
                handleQuitConfirm();
              }}
            >
              End Quiz
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

export default Quiz;
