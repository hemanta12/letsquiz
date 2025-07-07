import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, Typography, Modal, Icon } from '../../components/common';
import ActivityDetailContent from '../../components/Dashboard/ActivityDetailContent';
import { GroupPlayer, SessionDetail, QuestionDetail } from '../../types/dashboard.types';
import { Question } from '../../types/api.types';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { resetQuiz } from '../../store/slices/quizSlice';
import { resetTempScores } from '../../store/slices/groupQuizSlice';
import styles from './Results.module.css';

interface ResultsComponentProps {
  mode: 'Solo' | 'Group';
  category: string;
  difficulty: string;
  questions: Question[];
  score: number;
  selectedAnswers: string[];
  groupSession?: { players: GroupPlayer[] };
  correctnessData?: Array<{ questionId: string; playerId: number }>;
}

const ResultsComponent: React.FC<ResultsComponentProps> = ({
  mode,
  category,
  difficulty,
  questions,
  score,
  selectedAnswers,
  groupSession,
  correctnessData,
}) => {
  // Helper to get multiple correct player names for a question
  const getCorrectPlayers = (questionId: string): string[] => {
    console.log('[DEBUG] Finding correct players for question:', questionId);
    console.log('[DEBUG] Correctness data:', correctnessData);

    if (!correctnessData || !groupSession?.players) {
      console.log('[DEBUG] Missing correctness data or players');
      return [];
    }

    const correctAnswers = correctnessData.filter(
      (cd) => String(cd.questionId) === String(questionId)
    );

    if (correctAnswers.length === 0) {
      console.log('[DEBUG] No correctness data found for question:', questionId);
      return [];
    }

    const players = correctAnswers
      .map((cd) => groupSession.players?.find((p) => p.id === cd.playerId))
      .filter((player) => player !== undefined)
      .map((player) => player!.name);

    console.log('[DEBUG] Found players:', players);
    return players;
  };

  // Helper to get single correct player name for backward compatibility
  const getCorrectPlayer = (questionId: string) => {
    const players = getCorrectPlayers(questionId);
    return players.length > 0 ? players[0] : 'None';
  };
  console.log('[DEBUG] ResultsComponent received:', {
    mode,
    hasCorrectnessData: !!correctnessData,
    correctnessDataCount: correctnessData?.length || 0,
    groupPlayersCount: groupSession?.players?.length || 0,
  });
  const totalQuestions = questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Only reset state when navigating away from results
  const handlePlayAgain = () => {
    dispatch(resetQuiz());
    dispatch(resetTempScores());
    navigate('/');
  };

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleReviewSession = () => {
    console.log('[DEBUG] Reviewing session with correctness data:', {
      correctnessData,
      groupPlayers: groupSession?.players?.map((p) => ({
        name: p.name,
        score: p.score,
        answers: p.answers,
      })),
    });
    const sessionDetail: SessionDetail = {
      session_id: Date.now(),
      category,
      difficulty,
      score,
      started_at: new Date().toISOString(),
      is_group_session: mode === 'Group',
      group_players: groupSession?.players,
      questions: questions.map<QuestionDetail>((q, idx) => {
        const questionId = String(q.id);
        const correctPlayers = mode === 'Group' ? getCorrectPlayers(questionId) : [];

        console.log('[DEBUG] Passing to QuestionDetail:', {
          questionId: questionId,
          correctPlayer: mode === 'Group' ? getCorrectPlayer(questionId) : undefined,
          correctPlayers: correctPlayers,
          correctAnswer: q.correct_answer,
          debugInfo: {
            correctnessData: correctnessData,
            players: groupSession?.players,
          },
        });

        return {
          id: typeof q.id === 'number' ? q.id : idx,
          question: q.question_text,
          userAnswer: selectedAnswers[idx] || '',
          correctAnswer: q.correct_answer,
          correctPlayer: mode === 'Group' ? getCorrectPlayer(questionId) : undefined,
          correctPlayers: correctPlayers,
          debugInfo:
            mode === 'Group'
              ? {
                  questionId: questionId,
                  correctnessData: correctnessData,
                  players: groupSession?.players,
                }
              : undefined,
        };
      }),
      totalQuestions,
    };
    setSelectedSession(sessionDetail);
    setShowModal(true);
  };

  const getSoloTitle = (pct: number): string => {
    if (pct === 100) return 'Perfection!';
    if (pct >= 80) return 'Great Job!';
    if (pct >= 60) return 'Nice Work!';
    if (pct >= 30) return 'Keep Going!';
    return "Don't Give Up!";
  };

  // Tie-breaking logic: if players have the same score,
  // the winner is determined by who reached the high score first (based on question order)
  const sortedPlayers = groupSession?.players
    ? [...groupSession.players].sort((a, b) => {
        // Primary sort: by score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (!correctnessData || correctnessData.length === 0) {
          return 0;
        }

        let scoreA = 0;
        let scoreB = 0;
        let questionIndexA = -1;
        let questionIndexB = -1;

        // Go through each question to find when each player reached their final score
        for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
          const questionId = String(questions[questionIndex].id);

          // Check if player A got this question right
          const playerACorrect = correctnessData.some(
            (cd) => String(cd.questionId) === questionId && cd.playerId === a.id
          );
          if (playerACorrect) {
            scoreA += 5;
            if (scoreA === a.score && questionIndexA === -1) {
              questionIndexA = questionIndex;
            }
          }

          // Check if player B got this question right
          const playerBCorrect = correctnessData.some(
            (cd) => String(cd.questionId) === questionId && cd.playerId === b.id
          );
          if (playerBCorrect) {
            scoreB += 5;
            if (scoreB === b.score && questionIndexB === -1) {
              questionIndexB = questionIndex;
            }
          }
        }

        // If both players reached their score, the one who reached it first wins
        if (questionIndexA !== -1 && questionIndexB !== -1) {
          return questionIndexA - questionIndexB;
        }

        return 0;
      })
    : [];

  return (
    <motion.div
      className={styles.results}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h1">Quiz Results</Typography>
      {mode === 'Solo' ? (
        <>
          <div className={styles.scoreCard}>
            <div className={styles.iconPlaceholder} aria-hidden="true">
              <Icon className={styles.trophyIcon} name="trophy" size="large" />
            </div>

            {/* Dynamic title */}
            <Typography variant="h2">{getSoloTitle(percentage)}</Typography>

            {/* Subtext */}
            <Typography variant="caption" className={styles.subtext}>
              You’ve completed the{' '}
              <span className={styles.category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>{' '}
              quiz in
              <span className={styles.difficulty}>
                {' '}
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{' '}
              </span>{' '}
              mode.
            </Typography>

            {/* Stats Grid */}
            <div className={styles.breakdown}>
              <div className={`${styles.stat} ${styles.yourScore}`}>
                <Typography variant="body2">Your Score</Typography>
                <Typography variant="h1">{percentage}%</Typography>
              </div>

              <div className={`${styles.stat} ${styles.correctAnswers}`}>
                <Typography variant="body2">Correct Answers</Typography>
                <Typography variant="h1">
                  {score}/{totalQuestions}
                </Typography>
              </div>
            </div>

            {/* Encouragement banner */}
            <div className={styles.banner}>
              <Typography variant="body1" className={styles.bannerTitle}>
                Keep Learning & Improving!
              </Typography>
              <Typography variant="caption">
                Each quiz is a step forward. Try another category or review your answers.
              </Typography>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              <Button variant="primary" onClick={handlePlayAgain} aria-label="Play again">
                Play Another
              </Button>
              <Button
                variant="secondary"
                onClick={handleReviewSession}
                aria-label="Review your recent quiz session"
              >
                Review your Session
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.groupResults}>
            <Typography variant="caption" className={styles.subtext}>
              You’ve completed the{' '}
              <span className={styles.category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>{' '}
              quiz in
              <span className={styles.difficulty}>
                {' '}
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}{' '}
              </span>{' '}
              mode.
            </Typography>

            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`${styles.playerResult} ${index === 0 ? styles.winner : styles.runnerUp}`}
              >
                <div
                  className={`${styles.positionNumber} ${
                    index < 3 ? styles[`position-${index + 1}`] : styles['position-other']
                  }`}
                >
                  {index + 1}
                </div>
                {index === 0 && <div className={styles.winnerLabel}>Winner!</div>}
                <div className={styles.playerInfo}>
                  <Typography variant="h3" className={styles.playerName}>
                    {player.name}
                  </Typography>
                  <Typography variant="h3" className={styles.playerScore}>
                    {player.score} pts
                  </Typography>
                </div>
              </div>
            ))}
            <div className={styles.actions}>
              <Button variant="primary" onClick={handlePlayAgain}>
                Play Another
              </Button>
              <Button
                variant="primary"
                className={styles.reviewButton}
                onClick={handleReviewSession}
                aria-label="Review your recent quiz session"
              >
                Review your Session
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={showModal} onClose={handleCloseModal} title="Quiz Results">
        {selectedSession && <ActivityDetailContent sessionDetail={selectedSession} />}
      </Modal>
    </motion.div>
  );
};

export default ResultsComponent;
