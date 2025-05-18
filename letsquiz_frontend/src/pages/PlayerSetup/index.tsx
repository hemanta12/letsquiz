import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '../../components/common';
import PlayerManagement from '../../components/GroupMode/PlayerManagement';
import { Player } from '../../types/group.types';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setQuizSettings, startGroupQuiz } from '../../store/slices/quizSlice';
import { setGroupSession } from '../../store/slices/groupQuizSlice';
import QuizService from '../../services/quizService';
import styles from './PlayerSetup.module.css';

export const PlayerSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mode, category, categoryId, difficulty, isMixedMode, numberOfQuestions } = useAppSelector(
    (state) => state.quiz.settings
  );

  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleBack = () => {
    navigate('/');
  };

  const handlePlayersConfirmed = useCallback(
    async (players: Player[]) => {
      setSessionError(null);
      try {
        const resultAction = await dispatch(
          startGroupQuiz({
            players: players.map((player) => player.name),
            categoryId: categoryId,
            difficulty: difficulty,
            numberOfQuestions: numberOfQuestions,
          })
        );

        if (startGroupQuiz.fulfilled.match(resultAction)) {
          navigate('/quiz');
        } else {
          const errorMessage = resultAction.payload as string;
          setSessionError(errorMessage || 'Failed to start group quiz. Please try again.');
          console.error('Error starting group session:', errorMessage);
        }
      } catch (error: any) {
        console.error('Unexpected error starting group session:', error);
        setSessionError(error.message || 'Failed to start group quiz. Please try again.');
      }
    },
    [dispatch, categoryId, difficulty, navigate]
  );

  return (
    <div className={styles.playerSetup}>
      <Button variant="secondary" onClick={handleBack} className={styles.backButton}>
        Back
      </Button>
      <PlayerManagement onPlayersConfirmed={handlePlayersConfirmed} />
      {sessionError && (
        <Typography variant="body2" color="error" className={styles.errorMessage}>
          {sessionError}
        </Typography>
      )}
    </div>
  );
};

export default PlayerSetup;
