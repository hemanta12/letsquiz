import { useAppDispatch } from '../../hooks/reduxHooks';
import { updateScore, setSavedSessionId } from '../../store/slices/quizSlice';
import { Question } from '../../types/api.types';
import { calculateQuizScore } from '../../utils/quizUtils';

// Level 1: auth-free completion — score is stored locally in Redux only.
// Higher levels should extend this interface and re-enable server persistence.
interface SaveQuizSessionParams {
  selectedAnswers: Record<number, string>;
  questions: Question[];
}

export const useQuizSession = () => {
  const dispatch = useAppDispatch();

  const saveQuizSession = ({ selectedAnswers, questions }: SaveQuizSessionParams) => {
    dispatch(updateScore());
    dispatch(setSavedSessionId(null));
  };

  return {
    saveQuizSession,
    calculateQuizScore,
  };
};
