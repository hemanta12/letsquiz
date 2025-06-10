import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import { resetTempScores, resetGroupQuiz } from '../../store/slices/groupQuizSlice';
import { resetUI } from '../../store/slices/uiSlice';

/** URLs where quiz state is allowed to exist */
const WHITELIST = ['/quiz', '/results', '/player-setup'];

export const QuizStateHandler: React.FC = () => {
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();

  /** Strip query-strings & trailing slashes for comparison */
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '');
  const quizHasData = useAppSelector(
    (s) => s.quiz.questions.length > 0 || Object.keys(s.quiz.selectedAnswers).length > 0
  );

  useEffect(() => {
    if (quizHasData && !WHITELIST.some((p) => cleanPath.startsWith(p))) {
      // user navigated away from quiz/results → reset everything
      dispatch(resetQuiz());
      dispatch(resetTempScores());
      dispatch(resetGroupQuiz());
      dispatch(resetUI());
    }
  }, [cleanPath, quizHasData, dispatch]);

  return null;
};
