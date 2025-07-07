import React, { KeyboardEvent } from 'react';
import { Button, Typography, Icon } from '../common';
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

          // Determine which icon to show
          let iconElement = null;
          if (showFeedback) {
            if (isSelected && isCorrectAnswer) {
              iconElement = (
                <div className={`${commonStyles.optionIcon} ${commonStyles.optionIconSuccess}`}>
                  <Icon name="check" size="xs" color="white" />
                </div>
              );
            } else if (isSelected && !isCorrectAnswer) {
              iconElement = (
                <div className={`${commonStyles.optionIcon} ${commonStyles.optionIconError}`}>
                  <Icon name="close" size="xs" color="white" />
                </div>
              );
            } else if (!isSelected && isCorrectAnswer) {
              iconElement = (
                <div className={`${commonStyles.optionIcon} ${commonStyles.optionIconSuccess}`}>
                  <Icon name="check" size="xs" color="white" />
                </div>
              );
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
              style={{ position: 'relative' }}
            >
              {option}
              {iconElement}
            </Button>
          );
        })}
      </div>
    </>
  );
};
