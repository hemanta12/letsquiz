import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GroupPlayer } from '../../types/quiz.types';
import { Button } from '../common/Button';
import { Typography } from '../common/Typography';
import styles from './GroupQuestionView.module.css';
import { setTempPlayerScore } from '../../store/slices/groupQuizSlice';

interface GroupQuestionViewProps {
  questionNumber: number;
  totalQuestions: number;
  question: string;
  options: string[];
  correctAnswer: string;
  onAnswerSelect: (answer: string) => void;
  showFeedback: boolean;
  selectedAnswer?: string;
  onPlayerSelected: (playerId: string | null) => void;
  currentScoredPlayer: string | null;
}

export const GroupQuestionView: React.FC<GroupQuestionViewProps> = ({
  questionNumber,
  totalQuestions,
  question,
  options,
  correctAnswer,
  onAnswerSelect,
  showFeedback,
  selectedAnswer,
  onPlayerSelected,
  currentScoredPlayer,
}) => {
  const dispatch = useDispatch();
  const players = useSelector((state: any) => state.groupQuiz.groupSession?.players || []);

  const handlePlayerScore = (playerId: number) => {
    // Expect number for playerId
    if (showFeedback) {
      // Dispatch setTempPlayerScore for real-time UI update
      dispatch(setTempPlayerScore({ playerId: playerId, tempScore: 5 }));
      onPlayerSelected(playerId.toString());
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.scoreBoard}>
        {players.map((player: GroupPlayer) => (
          <div key={player.id} className={styles.playerScore}>
            <div className={styles.playerName}>{player.name}</div>
            <div className={styles.score}>
              {player.uiScore !== undefined ? player.uiScore : player.score}{' '}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.question}>
        <Typography variant="h2">{question}</Typography>
      </div>

      {showFeedback && (
        <Typography
          variant="h3"
          className={styles.feedback}
          style={{
            color: selectedAnswer === correctAnswer ? 'var(--color-easy)' : 'var(--color-quit)',
          }}
        >
          {selectedAnswer === correctAnswer ? 'Correct!' : 'Incorrect!'}
        </Typography>
      )}

      <div className={styles.options}>
        {options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = option === correctAnswer;
          let optionClassNames = `${styles.option}`;

          if (showFeedback) {
            if (isSelected) {
              optionClassNames += ` ${styles.selected}`;
              if (isCorrectAnswer) {
                optionClassNames += ` ${styles.correct}`;
              } else {
                optionClassNames += ` ${styles.incorrect}`;
              }
            } else if (isCorrectAnswer) {
              optionClassNames += ` ${styles.correct}`;
            } else {
              optionClassNames += ` ${styles.wrong}`;
            }
          }

          return (
            <Button
              key={option}
              variant="secondary"
              className={optionClassNames}
              onClick={() => onAnswerSelect(option)}
              disabled={showFeedback}
            >
              {option}
            </Button>
          );
        })}
      </div>

      <div className={styles.playerSelection}>
        <Typography variant="h3">Who got it right? (5 points)</Typography>
        <div className={styles.playerButtons}>
          {players.map((player: GroupPlayer) => (
            <Button
              key={player.id}
              variant="secondary"
              onClick={() => handlePlayerScore(player.id)}
              disabled={!showFeedback}
            >
              {player.name}
              {currentScoredPlayer === player.id.toString() && ' (Selected)'}{' '}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
