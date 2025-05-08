import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '../../components/common';
import PlayerManagement from '../../components/GroupMode/PlayerManagement';
import { Player } from '../../types/group.types';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setQuizSettings } from '../../store/slices/quizSlice';
import { setGroupSession } from '../../store/slices/groupQuizSlice';
import QuizService from '../../services/quizService';
import styles from './PlayerSetup.module.css';

export const PlayerSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mode, category, difficulty, isMixedMode } = useAppSelector(
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
        dispatch(
          setQuizSettings({
            mode,
            category,
            difficulty,
            isMixedMode,
          })
        );

        const groupSession = await QuizService.createGroupSession(
          players.map((player) => player.name),
          category,
          difficulty
        );

        dispatch(setGroupSession(groupSession));

        navigate('/quiz');
      } catch (error: any) {
        console.error('Error creating group session:', error);

        setSessionError(error.message || 'Failed to start group quiz. Please try again.');
      }
    },
    [dispatch, mode, category, difficulty, isMixedMode, navigate]
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
