import React, { useEffect, useMemo, useState } from 'react';
import ResultsComponent from '../../components/Results';
import { useAppSelector } from '../../hooks/reduxHooks';
import { Loading, Typography, Button } from '../../components/common';
import QuizService from '../../services/quizService';
import { BackendQuizSessionResponse } from '../../types/api.types';
import { useNavigate } from 'react-router-dom';

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, category, difficulty, questions, score, selectedAnswers, savedSessionId } =
    useAppSelector((state) => state.quiz);
  const groupSession = useAppSelector((state) => state.groupQuiz.groupSession);
  const playerCorrectness = useAppSelector((state) => state.groupQuiz.playerCorrectness);
  const safeMode = mode === 'Solo' || mode === 'Group' ? mode : 'Solo';

  const [hydratedSession, setHydratedSession] = useState<BackendQuizSessionResponse | null>(null);
  const [loadingHydratedSession, setLoadingHydratedSession] = useState(false);
  const [hydrationError, setHydrationError] = useState<string | null>(null);

  useEffect(() => {
    const hydrateResultsFromSavedSession = async () => {
      if (!savedSessionId || questions.length > 0) {
        return;
      }

      setLoadingHydratedSession(true);
      setHydrationError(null);

      try {
        const sessionDetail = await QuizService.fetchQuizSessionDetails(savedSessionId);
        setHydratedSession(sessionDetail);
      } catch (error: any) {
        setHydrationError(
          error?.message ||
            'Unable to load your latest quiz results right now. You can start a new quiz from home.'
        );
      } finally {
        setLoadingHydratedSession(false);
      }
    };

    hydrateResultsFromSavedSession();
  }, [savedSessionId, questions.length]);

  const hydratedQuestions = useMemo(() => {
    if (!hydratedSession?.questions?.length) {
      return [];
    }

    return hydratedSession.questions.map((question) => ({
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      question_text: question.text,
      correct_answer: question.correct_answer,
      metadata_json: null,
      is_seeded: true,
      is_fallback: false,
      created_by: null,
      answer_options: question.options,
    }));
  }, [hydratedSession]);

  const effectiveQuestions = questions.length > 0 ? questions : hydratedQuestions;
  const displayQuestions = effectiveQuestions;
  const effectiveSelectedAnswers =
    questions.length > 0
      ? Object.values(selectedAnswers)
      : hydratedSession?.questions?.map((question) => question.selected_answer || '') || [];
  const effectiveCategory = category || hydratedSession?.category || 'Mixed';
  const effectiveDifficulty = difficulty || hydratedSession?.difficulty || 'Unknown';
  const effectiveScore =
    questions.length > 0
      ? score
      : hydratedSession?.questions?.filter((question) => question.is_correct).length || 0;

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

  if (loadingHydratedSession) {
    return <Loading />;
  }

  if (displayQuestions.length === 0) {
    return (
      <div>
        <Typography variant="h2">Results unavailable</Typography>
        <Typography variant="body1">
          {hydrationError ||
            'We could not find quiz result data for this page. You can safely start another quiz.'}
        </Typography>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    );
  }

  // Prepare correctness data for ResultsComponent
  const correctnessData = effectiveQuestions
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
      category={effectiveCategory}
      difficulty={effectiveDifficulty}
      questions={displayQuestions}
      score={effectiveScore}
      selectedAnswers={effectiveSelectedAnswers}
      groupSession={mappedGroupSession}
      correctnessData={correctnessData}
    />
  );
};

export default ResultsPage;
