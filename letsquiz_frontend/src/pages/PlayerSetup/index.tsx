import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography, Icon } from '../../components/common';
import PlayerManagement from '../../components/GroupMode/PlayerManagement';
import { Player } from '../../types/group.types';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { startGroupQuiz } from '../../store/slices/quizSlice';
import styles from './PlayerSetup.module.css';

export const PlayerSetup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { categoryId, difficulty, numberOfQuestions } = useAppSelector(
    (state) => state.quiz.settings
  );

  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isStartingQuiz, setIsStartingQuiz] = useState(false);

  const handleBack = () => {
    navigate('/');
  };

  const handlePlayersConfirmed = useCallback(
    async (players: Player[]) => {
      setSessionError(null);
      setIsStartingQuiz(true);

      const capitalize = (name: string) =>
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

      try {
        const resultAction = await dispatch(
          startGroupQuiz({
            players: players.map((player) => capitalize(player.name)),
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
        }
      } catch (error: any) {
        setSessionError(error.message || 'Failed to start group quiz. Please try again.');
      } finally {
        setIsStartingQuiz(false);
      }
    },
    [dispatch, categoryId, difficulty, numberOfQuestions, navigate]
  );

  return (
    <div className={styles.playerSetup}>
      <div className={styles.backButtonContainer}>
        <Icon name="arrowLeft" size="medium" className={styles.backIcon} />
        <Button variant="secondary" onClick={handleBack} className={styles.backButton}>
          Back
        </Button>
      </div>

      <PlayerManagement onPlayersConfirmed={handlePlayersConfirmed} isLoading={isStartingQuiz} />
      {sessionError && (
        <Typography variant="body2" color="error" className={styles.errorMessage}>
          {sessionError}
        </Typography>
      )}
    </div>
  );
};

export default PlayerSetup;
