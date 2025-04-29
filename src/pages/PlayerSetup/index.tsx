import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common';
import PlayerManagement from '../../components/GroupMode/PlayerManagement';
import { Player } from '../../types/group.types';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setQuizSettings } from '../../store/slices/quizSlice';
import styles from './PlayerSetup.module.css';

export const PlayerSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { mode, category, difficulty, isMixedMode } = useAppSelector(
    (state) => state.quiz.settings
  );

  const handleBack = () => {
    navigate('/');
  };

  const handlePlayersConfirmed = (players: Player[]) => {
    dispatch(
      setQuizSettings({
        mode,
        category,
        difficulty,
        isMixedMode,
        groupState: {
          players,
          currentPlayerIndex: 0,
          roundNumber: 1,
        },
      })
    );
    navigate('/quiz');
  };

  return (
    <div className={styles.playerSetup}>
      <Button variant="secondary" onClick={handleBack} className={styles.backButton}>
        Back
      </Button>
      <PlayerManagement onPlayersConfirmed={handlePlayersConfirmed} />
    </div>
  );
};

export default PlayerSetup;
