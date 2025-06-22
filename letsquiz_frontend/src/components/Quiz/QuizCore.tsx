import React from 'react';
import { Button, Typography, Loading } from '../../components/common';
import commonStyles from './QuizCommon.module.css';

interface QuizCoreProps {
  mode: string;
  difficulty: string;
  category: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  progress: number;
  isLoading: boolean;
  error: string | null;
  onQuit: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  nextButtonLabel: string;
  children: React.ReactNode;
}

export const QuizCore: React.FC<QuizCoreProps> = ({
  mode,
  difficulty,
  category,
  currentQuestionIndex,
  totalQuestions,
  progress,
  isLoading,
  error,
  onQuit,
  onNext,
  isNextDisabled,
  nextButtonLabel,
  children,
}) => {
  if (isLoading) {
    return (
      <div className={commonStyles.quiz}>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className={commonStyles.quiz}>
        <Typography variant="body2" color="error" className={commonStyles.error}>
          {error}
        </Typography>
      </div>
    );
  }

  return (
    <div className={commonStyles.quiz}>
      <div className={commonStyles.header}>
        <Typography variant="body1">
          {mode} - {difficulty} - {category}
        </Typography>
        <Typography variant="body1">
          Question {currentQuestionIndex + 1}/{totalQuestions}
        </Typography>
      </div>

      <div className={commonStyles.progress}>
        <div className={commonStyles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      {children}

      <div className={commonStyles.actions}>
        <Button variant="quit" onClick={onQuit}>
          Quit
        </Button>
        <Button
          variant="primary"
          className={commonStyles.nextOrFinishButton}
          disabled={isNextDisabled}
          onClick={onNext}
        >
          {nextButtonLabel}
        </Button>
      </div>
    </div>
  );
};

export default QuizCore;
