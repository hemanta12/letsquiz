import React from 'react';
import ResultsComponent from '../../components/Results';
import { useAppSelector } from '../../hooks/reduxHooks';

const ResultsPage: React.FC = () => {
  const { mode, category, difficulty, questions, score, selectedAnswers } = useAppSelector(
    (state) => state.quiz
  );
  const groupSession = useAppSelector((state) => state.groupQuiz.groupSession);

  // Ensure mode is either 'Solo' or 'Group'
  const safeMode = mode === 'Solo' || mode === 'Group' ? mode : 'Solo';

  return (
    <ResultsComponent
      mode={safeMode}
      category={category}
      difficulty={difficulty}
      questions={questions}
      score={score}
      selectedAnswers={Object.values(selectedAnswers)}
      groupSession={groupSession ?? undefined}
    />
  );
};

export default ResultsPage;
