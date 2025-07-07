import React from 'react';
import ResultsComponent from '../../components/Results';
import { useAppSelector } from '../../hooks/reduxHooks';

const ResultsPage: React.FC = () => {
  const { mode, category, difficulty, questions, score, selectedAnswers } = useAppSelector(
    (state) => state.quiz
  );
  const groupSession = useAppSelector((state) => state.groupQuiz.groupSession);
  const playerCorrectness = useAppSelector((state) => state.groupQuiz.playerCorrectness);
  const safeMode = mode === 'Solo' || mode === 'Group' ? mode : 'Solo';

  const mappedGroupSession =
    groupSession && groupSession.players
      ? {
          ...groupSession,
          players: groupSession.players.map((player: any) => ({
            ...player,
            answers: player.answers ?? [],
          })),
        }
      : undefined;

  // Prepare correctness data for ResultsComponent
  const correctnessData = questions
    ?.flatMap((question, index) => {
      const correctPlayerIds = playerCorrectness[index] || [];
      return correctPlayerIds
        .filter((playerId) => groupSession?.players?.some((p) => p.id === playerId))
        .map((playerId) => ({
          questionId: String(question.id),
          playerId: playerId,
        }));
    })
    .filter(Boolean) as Array<{ questionId: string; playerId: number }>;

  return (
    <ResultsComponent
      mode={safeMode}
      category={category}
      difficulty={difficulty}
      questions={questions}
      score={score}
      selectedAnswers={Object.values(selectedAnswers)}
      groupSession={mappedGroupSession}
      correctnessData={correctnessData}
    />
  );
};

export default ResultsPage;
