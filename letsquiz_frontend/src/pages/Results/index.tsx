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

  // Map groupSession.players to include 'answers' property if needed
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
    ?.map((question, index) => {
      const correctPlayerId = playerCorrectness[index];
      if (!correctPlayerId || !groupSession?.players?.some((p) => p.id === correctPlayerId)) {
        return null;
      }
      return {
        questionId: String(question.id),
        playerId: correctPlayerId,
      };
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
