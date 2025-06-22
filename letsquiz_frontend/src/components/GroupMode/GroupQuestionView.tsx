import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GroupPlayer } from '../../types/quiz.types';
import { Typography } from '../common';
import styles from './GroupQuestionView.module.css';
import { setTempPlayerScore } from '../../store/slices/groupQuizSlice';
import { QuizCore } from '../Quiz/QuizCore';
import { QuestionContent } from '../Quiz/QuestionContent';

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
  difficulty: string;
  category: string;
  isLoading: boolean;
  error: string | null;
  onQuit: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  noWrapper?: boolean;
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
  difficulty,
  category,
  isLoading,
  error,
  onQuit,
  onNext,
  isNextDisabled,
  noWrapper = false,
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

  const progress = (questionNumber / totalQuestions) * 100;
  const nextButtonLabel = questionNumber === totalQuestions - 1 ? 'Finish Quiz' : 'Next Question';

  const content = (
    <div className={styles.groupContainer}>
      {/* Main question + options */}
      <div className={styles.mainContent}>
        <QuestionContent
          question={question}
          options={options}
          selectedAnswer={selectedAnswer}
          showFeedback={showFeedback}
          correctAnswer={correctAnswer}
          onAnswerSelect={onAnswerSelect}
          disabled={showFeedback}
          playerId={currentScoredPlayer || undefined}
        />
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

  if (noWrapper) {
    return content;
  }

  return (
    <QuizCore
      mode="Group Quiz"
      difficulty={difficulty}
      category={category}
      currentQuestionIndex={questionNumber}
      totalQuestions={totalQuestions}
      progress={progress}
      isLoading={isLoading}
      error={error}
      onQuit={onQuit}
      onNext={onNext}
      isNextDisabled={isNextDisabled}
      nextButtonLabel={nextButtonLabel}
    >
      {content}
    </QuizCore>
  );
};
