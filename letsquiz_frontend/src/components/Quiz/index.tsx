import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal } from '../../components/common';
import QuizCore from './QuizCore';
import { QuestionContent } from './QuestionContent';
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
  fetchQuizHistoryThunk,
} from '../../store/slices/quizSlice';
import { updatePlayerScore, resetTempScores } from '../../store/slices/groupQuizSlice';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import styles from './QuizComponent.module.css';
import commonStyles from './QuizCommon.module.css';

export const QuizComponent: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { isLoading, error, modals, feedback } = useAppSelector(selectUI);
  const { isGuest, featureGates } = useAppSelector((state) => state.auth);
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

  const { groupSession, playerCorrectness } = useAppSelector((state) => state.groupQuiz);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex] !== undefined;
  const progress =
    settings.numberOfQuestions > 0
      ? ((currentQuestionIndex + 1) / settings.numberOfQuestions) * 100
      : 0;
  const currentQuestionData = questions[currentQuestionIndex];

  useEffect(() => {
    if (!questions.length && !quizLoading && !quizError && difficulty) {
      // Fetch questions from all categories with the selected difficulty
      const requestParams = {
        difficulty,
        count: settings.numberOfQuestions,
        ...(categoryId && { category: categoryId }), // Only include category if not mix-up mode
      };

      dispatch(fetchQuizQuestions(requestParams));
    }
  }, [
    categoryId,
    difficulty,
    questions.length,
    quizLoading,
    quizError,
    settings.numberOfQuestions,
    dispatch,
  ]);

  const handleAnswerSelect = async (answer: string) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
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

      if (mode === 'Group' && selectedPlayers.length > 0) {
        selectedPlayers.forEach((playerId) => {
          dispatch(updatePlayerScore({ playerId: Number(playerId), score: 5 }));
        });
      }

      setSelectedPlayers([]);
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
              players: groupSession.players.map((player: GroupPlayer) => {
                // Build correct_answers object for this player
                const correct_answers: Record<string, boolean> = {};
                let playerFinalScore = 0;

                questions.forEach((question, questionIndex) => {
                  const correctPlayerIds = playerCorrectness[questionIndex] || [];
                  const isCorrect = correctPlayerIds.includes(player.id);
                  correct_answers[String(question.id)] = isCorrect;
                  if (isCorrect) {
                    playerFinalScore += 5;
                  }
                });

                return {
                  name: player.name,
                  score: playerFinalScore,
                  errors: player.errors,
                  answers: player.answers || [],
                  correct_answers,
                };
              }),
            });
          }

          const resultAction = await dispatch(saveQuizSessionThunk(quizSessionData));
          if (saveQuizSessionThunk.fulfilled.match(resultAction)) {
            dispatch(fetchQuizHistoryThunk());
          } else {
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

  const errorMessage =
    error ||
    quizError ||
    (questions.length === 0 ? 'No questions found for the selected criteria.' : null) ||
    (!currentQuestionData ? 'Error: Invalid question format' : null);

  return (
    <>
      <QuizCore
        mode={mode}
        difficulty={difficulty}
        category={category}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={settings.numberOfQuestions}
        progress={progress}
        isLoading={isLoading || quizLoading}
        error={errorMessage}
        onQuit={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
        onNext={handleNext}
        isNextDisabled={!hasSelectedAnswer || isLoading || quizLoading}
        nextButtonLabel={
          currentQuestionIndex === settings.numberOfQuestions - 1 ? 'Finish Quiz' : 'Next Question'
        }
      >
        {mode === 'Group' ? (
          <>
            {currentQuestionData ? (
              <GroupQuestionView
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={settings.numberOfQuestions}
                question={currentQuestionData.question_text}
                options={currentQuestionData.answer_options}
                correctAnswer={currentQuestionData.correct_answer}
                onAnswerSelect={handleAnswerSelect}
                showFeedback={feedback.show}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
                onPlayerSelected={(playerIds) => {
                  setSelectedPlayers(playerIds);
                }}
                currentScoredPlayers={selectedPlayers}
                difficulty={difficulty}
                category={category}
                isLoading={isLoading || quizLoading}
                error={errorMessage}
                onQuit={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
                onNext={handleNext}
                isNextDisabled={!hasSelectedAnswer || isLoading || quizLoading}
                noWrapper={true}
              />
            ) : (
              <Loading variant="skeleton" />
            )}
          </>
        ) : (
          <>
            {currentQuestionData ? (
              <QuestionContent
                question={currentQuestionData.question_text}
                options={currentQuestionData.answer_options}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
                showFeedback={feedback.show}
                correctAnswer={currentQuestionData.correct_answer}
                onAnswerSelect={handleAnswerSelect}
                disabled={hasSelectedAnswer || isLoading || quizLoading}
              />
            ) : (
              <Loading variant="skeleton" />
            )}
          </>
        )}
      </QuizCore>

      <Modal
        open={modals.quitQuiz}
        onClose={() => dispatch(setModal({ type: 'quitQuiz', isOpen: false }))}
        title="Quit Quiz"
      >
        <div className={styles.quitDialog}>
          <Typography variant="body1" className={commonStyles.quitDialogText}>
            Are you sure you want to quit?
          </Typography>
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
    </>
  );
};

export default QuizComponent;
