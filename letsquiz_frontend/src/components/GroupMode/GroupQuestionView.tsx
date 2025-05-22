import React from 'react';
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
  const players: GroupPlayer[] = useSelector(
    (state: any) => state.groupQuiz.groupSession?.players || []
  );

  const handlePlayerScore = (playerId: number) => {
    if (!showFeedback) return;
    dispatch(setTempPlayerScore({ playerId, tempScore: 5 }));
    onPlayerSelected(playerId.toString());
  };

  return (
    <div className={styles.groupContainer}>
      {/* Main question + options */}
      <div className={styles.mainContent}>
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
            let optionClassNames = styles.option;

            if (showFeedback) {
              if (isSelected) {
                optionClassNames += ` ${styles.selected}`;
                optionClassNames += isCorrectAnswer ? ` ${styles.correct}` : ` ${styles.incorrect}`;
              } else if (isCorrectAnswer) {
                optionClassNames += ` ${styles.correct}`;
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
      </div>

      {/* Sidebar: interactive scoreboard */}
      <aside className={styles.sidebar}>
        <Typography variant="h3">Select who got it right</Typography>

        {players.length <= 8 ? (
          <div className={styles.playerList}>
            {players.map((player) => {
              const isActive = currentScoredPlayer === player.id.toString();
              return (
                <div
                  key={player.id}
                  className={`${styles.playerCard} ${isActive ? styles.selectedCard : ''}`}
                  onClick={() => handlePlayerScore(player.id)}
                  aria-disabled={!showFeedback}
                >
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.score}> {player.uiScore ?? player.score}pt</span>
                </div>
              );
            })}
          </div>
        ) : (
          <select
            className={styles.playerDropdown}
            disabled={!showFeedback}
            value={currentScoredPlayer || ''}
            onChange={(e) => handlePlayerScore(Number(e.target.value))}
          >
            <option value="" disabled>
              Choose Player
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </aside>
    </div>
  );
};
