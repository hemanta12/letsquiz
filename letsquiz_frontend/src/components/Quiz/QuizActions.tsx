import { useState } from 'react';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { selectAnswer, nextQuestion, setAnswerCorrectness } from '../../store/slices/quizSlice';
import { updatePlayerScore, resetTempScores } from '../../store/slices/groupQuizSlice';
import { setLoading, setError, setFeedback, setModal } from '../../store/slices/uiSlice';
import { Question } from '../../types/api.types';
import { areAnswersEquivalent } from '../../utils/quizUtils';

interface HandleAnswerSelectParams {
  answer: string;
  hasSelectedAnswer: boolean;
  isLoading: boolean;
  quizLoading: boolean;
  currentQuestionIndex: number;
  currentQuestionData: Question;
  isGuest: boolean;
}

interface HandleNextParams {
  mode: string;
  selectedPlayers: string[];
  currentQuestionIndex: number;
  numberOfQuestions: number;
  questionsLength: number;
  selectedAnswers: Record<number, string>;
  questions: Question[];
  categoryId?: number;
  difficulty: string;
  isGuest: boolean;
  featureGatesMaxQuestions: number;
  onFinishQuiz: () => Promise<void>;
}

export const useQuizActions = () => {
  const dispatch = useAppDispatch();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleAnswerSelect = async ({
    answer,
    hasSelectedAnswer,
    isLoading,
    quizLoading,
    currentQuestionIndex,
    currentQuestionData,
    isGuest,
  }: HandleAnswerSelectParams) => {
    if (!hasSelectedAnswer && !isLoading && !quizLoading) {
      try {
        dispatch(selectAnswer({ questionIndex: currentQuestionIndex, answer }));

        const isCorrect = areAnswersEquivalent(answer, currentQuestionData?.correct_answer || '');

        dispatch(setAnswerCorrectness({ questionIndex: currentQuestionIndex, isCorrect }));

        dispatch(
          setFeedback({
            show: true,
            isCorrect,
            duration: 1000,
          })
        );
      } catch (err) {
        dispatch(setError('Error selecting answer'));
      }
    }
  };

  const handleNext = async ({
    mode,
    selectedPlayers,
    currentQuestionIndex,
    numberOfQuestions,
    questionsLength,
    selectedAnswers,
    questions,
    categoryId,
    difficulty,
    isGuest,
    featureGatesMaxQuestions,
    onFinishQuiz,
  }: HandleNextParams) => {
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

      const isLastQuestion =
        currentQuestionIndex >= Math.min(numberOfQuestions, questionsLength) - 1;

      if (isLastQuestion) {
        setIsFinishing(true);
        await onFinishQuiz();
        return;
      } else {
        if (isGuest && currentQuestionIndex >= featureGatesMaxQuestions - 1) {
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
      setIsFinishing(false);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return {
    selectedPlayers,
    setSelectedPlayers,
    isFinishing,
    setIsFinishing,
    handleAnswerSelect,
    handleNext,
  };
};
