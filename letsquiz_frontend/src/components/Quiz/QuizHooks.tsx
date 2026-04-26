import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchQuizQuestions, resetQuiz } from '../../store/slices/quizSlice';
import { resetTempScores, resetGroupQuiz } from '../../store/slices/groupQuizSlice';
import { resetUI, setFeedback } from '../../store/slices/uiSlice';

// Quiz initialization hook
interface QuizInitParams {
  difficulty: string;
  categoryId?: number;
  numberOfQuestions: number;
  quizLoading: boolean;
  quizError: string | null;
}

export const useQuizInit = ({
  difficulty,
  categoryId,
  numberOfQuestions,
  quizLoading,
  quizError,
}: QuizInitParams) => {
  const dispatch = useAppDispatch();
  const didDispatch = useRef(false);
  const questionsCount = useAppSelector((state) => state.quiz.questions.length);

  useEffect(() => {
    if (
      !didDispatch.current &&
      questionsCount === 0 &&
      !quizLoading &&
      !quizError &&
      difficulty &&
      numberOfQuestions > 0
    ) {
      didDispatch.current = true;
      const requestParams = {
        difficulty,
        count: numberOfQuestions,
        ...(categoryId && { category: categoryId }),
      };

      dispatch(fetchQuizQuestions(requestParams));
    }
  }, [categoryId, difficulty, quizLoading, quizError, numberOfQuestions, dispatch, questionsCount]);
};

// Quiz navigation hook
interface QuizNavigationParams {
  isQuizFinished: boolean;
  questionsLength: number;
  shouldShowLoading: boolean;
  isInitialLoading: boolean;
}

export const useQuizNavigation = ({
  isQuizFinished,
  questionsLength,
  shouldShowLoading,
  isInitialLoading,
}: QuizNavigationParams) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isQuizFinished && questionsLength > 0 && !shouldShowLoading && !isInitialLoading) {
      navigate('/results');
    }
  }, [isQuizFinished, questionsLength, shouldShowLoading, isInitialLoading, navigate]);

  const cleanupAndNavigate = (path: string) => {
    dispatch(resetQuiz());
    dispatch(resetTempScores());
    dispatch(resetUI());
    dispatch(setFeedback({ show: false, isCorrect: false }));
    setTimeout(() => navigate(path), 0);
  };

  return {
    cleanupAndNavigate,
  };
};

/** URLs where quiz state is allowed to exist */
const WHITELIST = ['/quiz', '/results', '/player-setup'];

export const useQuizStateHandler = () => {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();

  /** Strip query-strings & trailing slashes for comparison */
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '');

  const cleanupQuizState = (quizHasData: boolean) => {
    if (quizHasData && !WHITELIST.some((p) => cleanPath.startsWith(p))) {
      // user navigated away from quiz/results → reset everything
      dispatch(resetQuiz());
      dispatch(resetTempScores());
      dispatch(resetGroupQuiz());
      dispatch(resetUI());
    }
  };

  return {
    cleanupQuizState,
    cleanPath,
  };
};

// Quiz state handler component (moved from separate file)
export const QuizStateHandler: React.FC = () => {
  const { cleanupQuizState, cleanPath } = useQuizStateHandler();
  const quizHasData = useAppSelector(
    (s) => s.quiz.questions.length > 0 || Object.keys(s.quiz.selectedAnswers).length > 0
  );

  useEffect(() => {
    cleanupQuizState(quizHasData);
  }, [cleanPath, quizHasData, cleanupQuizState]);

  return null;
};
