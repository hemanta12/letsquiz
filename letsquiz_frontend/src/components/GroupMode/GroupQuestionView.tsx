import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GroupPlayer } from '../../types/quiz.types';
import { Typography } from '../common';
import styles from './GroupQuestionView.module.css';
import { recordPlayerAnswer, recordPlayerCorrectness } from '../../store/slices/groupQuizSlice';
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
  onPlayerSelected: (playerIds: string[]) => void;
  currentScoredPlayers: string[];
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
  currentScoredPlayers,
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
  const currentPlayer = useSelector((state: any) => state.groupQuiz.currentPlayer);
  const playerCorrectness = useSelector((state: any) => state.groupQuiz.playerCorrectness);

  const handleAnswerSelect = (answer: string) => {
    if (currentPlayer) {
      dispatch(
        recordPlayerAnswer({
          playerId: currentPlayer.id,
          questionIndex: questionNumber - 1,
          answer,
        })
      );
    }
    onAnswerSelect(answer);
  };

  const handlePlayerScore = (playerId: number) => {
    if (!showFeedback) return;

    // Get current correct players for this question
    const currentCorrectPlayers = playerCorrectness[questionNumber - 1] || [];
    const isCurrentlySelected = currentCorrectPlayers.includes(playerId);

    // Record player correctness for this question (toggles selection)
    const correctnessPayload = {
      questionIndex: questionNumber - 1,
      playerId,
    };
    dispatch(recordPlayerCorrectness(correctnessPayload));

    // Update parent component with new list of selected players
    const updatedCorrectPlayers = isCurrentlySelected
      ? currentCorrectPlayers.filter((id: number) => id !== playerId)
      : [...currentCorrectPlayers, playerId];

    onPlayerSelected(updatedCorrectPlayers.map((id: number) => id.toString()));
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
          onAnswerSelect={handleAnswerSelect}
          disabled={showFeedback}
          playerId={currentScoredPlayers.length > 0 ? currentScoredPlayers[0] : undefined}
        />
      </div>

      {/* Sidebar: interactive scoreboard */}
      <aside className={styles.sidebar}>
        <Typography variant="h2" className={styles.scoreboard}>
          Scoreboard
        </Typography>
        <Typography variant="body1">Select who got it right</Typography>
        <Typography variant="body2" className={styles.instruction}>
          You can select multiple players
          {currentScoredPlayers.length > 0 && (
            <span className={styles.selectionCounter}>
              ({currentScoredPlayers.length} selected)
            </span>
          )}
        </Typography>

        {players.length <= 8 ? (
          <div className={styles.playerList}>
            {players.map((player) => {
              const isActive = currentScoredPlayers.includes(player.id.toString());
              const displayScore = isActive ? player.score + 5 : player.score;
              return (
                <div
                  key={player.id}
                  className={`${styles.playerCard} ${isActive ? styles.selectedCard : ''}`}
                  onClick={() => handlePlayerScore(player.id)}
                  aria-disabled={!showFeedback}
                >
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.score}> {displayScore}</span>
                  {isActive && <span className={styles.checkmark}>✓</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.dropdownContainer}>
            <select
              className={styles.playerDropdown}
              disabled={!showFeedback}
              value=""
              onChange={(e) => handlePlayerScore(Number(e.target.value))}
            >
              <option value="" disabled>
                Choose Player to Toggle
              </option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {currentScoredPlayers.includes(p.id.toString()) ? '✓' : ''}
                </option>
              ))}
            </select>
            {currentScoredPlayers.length > 0 && (
              <div className={styles.selectedPlayersList}>
                <Typography variant="caption">Selected:</Typography>
                {currentScoredPlayers.map((playerId) => {
                  const player = players.find((p) => p.id.toString() === playerId);
                  return player ? (
                    <span key={playerId} className={styles.selectedPlayerTag}>
                      {player.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
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
