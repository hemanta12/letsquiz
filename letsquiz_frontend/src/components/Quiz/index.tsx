import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Loading, Modal } from '../../components/common';
import QuizCore from './QuizCore';
import { QuestionContent } from './QuestionContent';
import { GroupQuestionView } from '../../components/GroupMode/GroupQuestionView';
import { useQuizNavigation, useQuizInit } from './QuizHooks';
import { useQuizSession } from './QuizSession';
import { useQuizActions } from './QuizActions';
import { selectUI, setModal } from '../../store/slices/uiSlice';
import { setQuizSettings } from '../../store/slices/quizSlice';
import { QUIZ_SETTINGS_STORAGE_KEY } from '../../constants/storageKeys';
import styles from './QuizComponent.module.css';
import commonStyles from './QuizCommon.module.css';

export const QuizComponent: React.FC = () => {
  const QUIZ_LOADING_TIMEOUT_MS = 12000;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const attemptedRestoreRef = useRef(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const [hasLoadingTimedOut, setHasLoadingTimedOut] = useState(false);

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

  // Initialize quiz questions
  useQuizInit({
    difficulty,
    categoryId: categoryId || undefined,
    numberOfQuestions: settings.numberOfQuestions,
    quizLoading,
    quizError,
  });

  // Recover quiz setup after hard refresh/direct /quiz entry.
  useEffect(() => {
    if (attemptedRestoreRef.current || difficulty || questions.length > 0 || quizLoading) {
      return;
    }

    attemptedRestoreRef.current = true;

    try {
      const raw = sessionStorage.getItem(QUIZ_SETTINGS_STORAGE_KEY);
      if (!raw) return;

      const restored = JSON.parse(raw);
      if (!restored?.difficulty || !restored?.numberOfQuestions) return;

      dispatch(setQuizSettings(restored));
    } catch {
      // Ignore malformed storage payloads.
    }
  }, [difficulty, questions.length, quizLoading, dispatch]);

  // Quiz session handler
  const { saveQuizSession } = useQuizSession();

  // Quiz actions handler
  const { selectedPlayers, setSelectedPlayers, isFinishing, handleAnswerSelect, handleNext } =
    useQuizActions();

  // Computed values
  const totalQuestions = Math.min(settings.numberOfQuestions, questions.length);
  const hasSelectedAnswer = selectedAnswers[currentQuestionIndex] !== undefined;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const currentQuestionData = questions[currentQuestionIndex];
  const hasValidQuestion = currentQuestionData && currentQuestionIndex < questions.length;
  const isQuizFinished = currentQuestionIndex >= totalQuestions;
  const shouldRenderQuestion = hasValidQuestion && !isQuizFinished && !isFinishing;
  const isInitialLoading = !questions.length && quizLoading;
  const shouldShowLoading = isInitialLoading || quizLoading || isFinishing;

  // Navigation handler
  const { cleanupAndNavigate } = useQuizNavigation({
    isQuizFinished: currentQuestionIndex >= totalQuestions,
    questionsLength: questions.length,
    shouldShowLoading,
    isInitialLoading,
  });

  const errorMessage =
    error ||
    quizError ||
    (hasLoadingTimedOut
      ? 'Loading quiz is taking longer than expected. Please retry from Home.'
      : null) ||
    (!difficulty && questions.length === 0 && !quizLoading
      ? 'Quiz setup is missing. Please choose mode, category, and difficulty first.'
      : null) ||
    (questions.length === 0 ? 'No questions found for the selected criteria.' : null) ||
    (!hasValidQuestion && !isQuizFinished && !shouldShowLoading
      ? 'Error: Invalid question format'
      : null);

  useEffect(() => {
    if (!shouldShowLoading || questions.length > 0) {
      setHasLoadingTimedOut(false);
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      return;
    }

    if (loadingTimeoutRef.current === null) {
      loadingTimeoutRef.current = window.setTimeout(() => {
        setHasLoadingTimedOut(true);
      }, QUIZ_LOADING_TIMEOUT_MS);
    }

    return () => {
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [shouldShowLoading, questions.length, QUIZ_LOADING_TIMEOUT_MS]);

  // Event handlers
  const handleAnswerSelectWrapper = (answer: string) => {
    handleAnswerSelect({
      answer,
      hasSelectedAnswer,
      isLoading,
      quizLoading,
      currentQuestionIndex,
      currentQuestionData,
      isGuest,
    });
  };

  const handleNextWrapper = () => {
    const onFinishQuiz = async () => {
      saveQuizSession({ selectedAnswers, questions });
      navigate('/results');
    };

    handleNext({
      mode,
      selectedPlayers,
      currentQuestionIndex,
      numberOfQuestions: settings.numberOfQuestions,
      questionsLength: questions.length,
      selectedAnswers,
      questions,
      categoryId: categoryId || undefined,
      difficulty,
      isGuest,
      featureGatesMaxQuestions: featureGates.maxQuestionsPerQuiz,
      onFinishQuiz,
    });
  };

  const handleQuitConfirm = () => {
    dispatch(setModal({ type: 'quitQuiz', isOpen: false }));
    cleanupAndNavigate('/');
  };

  return (
    <>
      <QuizCore
        mode={mode}
        difficulty={difficulty}
        category={category}
        currentQuestionIndex={Math.min(currentQuestionIndex, totalQuestions - 1)}
        totalQuestions={totalQuestions}
        progress={progress}
        isLoading={shouldShowLoading}
        error={errorMessage}
        onQuit={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
        onNext={handleNextWrapper}
        isNextDisabled={!hasSelectedAnswer || shouldShowLoading || !shouldRenderQuestion}
        nextButtonLabel={
          currentQuestionIndex >= totalQuestions - 1 ? 'Finish Quiz' : 'Next Question'
        }
      >
        {isInitialLoading ? (
          <Loading variant="skeleton" />
        ) : mode === 'Group' ? (
          <>
            {shouldRenderQuestion ? (
              <GroupQuestionView
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={totalQuestions}
                question={currentQuestionData.question_text}
                options={currentQuestionData.answer_options}
                correctAnswer={currentQuestionData.correct_answer}
                isAnswerCorrect={feedback.isCorrect}
                onAnswerSelect={handleAnswerSelectWrapper}
                showFeedback={feedback.show}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
                onPlayerSelected={(playerIds) => {
                  setSelectedPlayers(playerIds);
                }}
                currentScoredPlayers={selectedPlayers}
                difficulty={difficulty}
                category={category}
                isLoading={quizLoading || isFinishing}
                error={errorMessage}
                onQuit={() => dispatch(setModal({ type: 'quitQuiz', isOpen: true }))}
                onNext={handleNextWrapper}
                isNextDisabled={!hasSelectedAnswer || shouldShowLoading}
                noWrapper={true}
              />
            ) : (
              <Loading variant="skeleton" />
            )}
          </>
        ) : (
          <>
            {shouldRenderQuestion ? (
              <QuestionContent
                question={currentQuestionData.question_text}
                options={currentQuestionData.answer_options}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
                showFeedback={feedback.show}
                correctAnswer={currentQuestionData.correct_answer}
                isAnswerCorrect={feedback.isCorrect}
                onAnswerSelect={handleAnswerSelectWrapper}
                disabled={hasSelectedAnswer || quizLoading || isFinishing}
              />
            ) : (
              <div className={commonStyles.errorContainer}>
                <Typography variant="body2" color="error" className={commonStyles.error}>
                  {errorMessage || 'Unable to render quiz question.'}
                </Typography>
                <Button variant="secondary" onClick={() => cleanupAndNavigate('/')}>
                  Back to Home
                </Button>
              </div>
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
