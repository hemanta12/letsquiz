import React from 'react';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { QuizComponent } from '../../components/Quiz';

export const QuizPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <QuizComponent />
    </ErrorBoundary>
  );
};

export default QuizPage;
