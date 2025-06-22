import React, { KeyboardEvent } from 'react';
import { Button, Typography } from '../common';
import commonStyles from './QuizCommon.module.css';
import { BaseQuestionProps } from '../../types/quiz.types';

export const handleKeyPress = (
  event: KeyboardEvent<HTMLButtonElement>,
  option: string,
  onAnswerSelect?: (answer: string) => void
) => {
  if ((event.key === 'Enter' || event.key === ' ') && onAnswerSelect) {
    onAnswerSelect(option);
  }
};

export const QuestionContent: React.FC<BaseQuestionProps> = ({
  question,
  options,
  selectedAnswer,
  showFeedback,
  correctAnswer,
  onAnswerSelect,
  disabled = false,
  playerId,
}) => {
  return (
    <>
      <div className={commonStyles.question}>
        <Typography variant="h2">{question}</Typography>
      </div>

      <div className={commonStyles.feedback}>
        {showFeedback && (
          <Typography
            variant="h3"
            style={{
              color:
                selectedAnswer === correctAnswer ? 'var(--color-success)' : 'var(--color-quit)',
            }}
          >
            {selectedAnswer === correctAnswer ? 'Correct!' : 'Incorrect!'}
          </Typography>
        )}
      </div>

      <div className={commonStyles.options}>
        {options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = option === correctAnswer;
          let optionClassNames = commonStyles.option;

          if (showFeedback) {
            if (isSelected) {
              optionClassNames += ` ${commonStyles.selected}`;
              if (isCorrectAnswer) {
                optionClassNames += ` ${commonStyles.correct}`;
              } else {
                optionClassNames += ` ${commonStyles.incorrect}`;
              }
            } else if (isCorrectAnswer) {
              optionClassNames += ` ${commonStyles.correct}`;
            }
          }

          return (
            <Button
              key={option}
              variant="secondary"
              className={optionClassNames}
              onClick={() => onAnswerSelect(option)}
              disabled={disabled || showFeedback}
              onKeyPress={(e) => handleKeyPress(e, option, onAnswerSelect)}
              tabIndex={0}
              aria-selected={isSelected}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </>
  );
};
