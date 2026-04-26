import React, { KeyboardEvent } from 'react';
import { Button, Typography, Icon } from '../common';
import commonStyles from './QuizCommon.module.css';
import { BaseQuestionProps } from '../../types/quiz.types';
import { areAnswersEquivalent } from '../../utils/quizUtils';

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
  isAnswerCorrect,
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
          const hasCanonicalCorrectAnswer =
            typeof correctAnswer === 'string' && correctAnswer.length > 0;
          const isCanonicalCorrectOption = hasCanonicalCorrectAnswer
            ? areAnswersEquivalent(option, correctAnswer)
            : false;
          let optionClassNames = commonStyles.option;

          if (isSelected) {
            optionClassNames += ` ${commonStyles.selected}`;
          }

          if (showFeedback) {
            if (isSelected) {
              if (isAnswerCorrect) {
                optionClassNames += ` ${commonStyles.correct}`;
              } else {
                optionClassNames += ` ${commonStyles.incorrect}`;
              }
            } else if (isCanonicalCorrectOption) {
              optionClassNames += ` ${commonStyles.correct}`;
            }
          }

          // Determine which icon to show
          let iconElement = null;
          if (showFeedback) {
            if (isSelected && isAnswerCorrect) {
              iconElement = (
                <div className={`${commonStyles.optionIcon} ${commonStyles.optionIconSuccess}`}>
                  <Icon name="check" size="xs" color="white" />
                </div>
              );
            } else if (isSelected && !isAnswerCorrect) {
              iconElement = (
                <div className={`${commonStyles.optionIcon} ${commonStyles.optionIconError}`}>
                  <Icon name="close" size="xs" color="white" />
                </div>
              );
            } else if (!isSelected && isCanonicalCorrectOption) {
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
