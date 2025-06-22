import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Player } from '../../../types/group.types';
import { Button, Input, Typography, Icon } from '../../common';
import styles from './PlayerManagement.module.css';
import { RootState } from '../../../store/store';

interface PlayerManagementProps {
  onPlayersConfirmed: (players: Player[]) => void;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({ onPlayersConfirmed }) => {
  const { loading } = useSelector((state: RootState) => state.quiz);

  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0, isCurrentTurn: false, errors: [] },
    { id: '2', name: '', score: 0, isCurrentTurn: false, errors: [] },
  ]);
  const [error, setError] = useState<string>('');

  // Validate before confirming and call the prop
  const handleConfirm = () => {
    const filledPlayers = players.filter((p) => p.name.trim());
    if (filledPlayers.length < 2) {
      setError('Minimum 2 players required');
      return;
    }
    setError('');
    onPlayersConfirmed(filledPlayers);
  };

  const handleAddPlayer = () => {
    if (players.length >= 6) {
      setError('Maximum 6 players allowed');
      return;
    }
    setPlayers([
      ...players,
      { id: `${players.length + 1}`, name: '', score: 0, isCurrentTurn: false, errors: [] },
    ]);
    setError('');
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 2) {
      setError('Minimum 2 players required');
      return;
    }
    setPlayers(players.filter((p) => p.id !== id));
    setError('');
  };

  const handleNameChange = (id: string, name: string) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));
    setError('');
  };

  return (
    <div className={styles.playerManagement}>
      <div className={styles.playerSetup}>
        <Typography variant="h2" className={styles.title}>
          Group Mode - Player Setup
        </Typography>
        <Typography variant="body1">
          Add players to start the quiz. You can add up to 6 players.
        </Typography>
        <div className={styles.playerList}>
          {players.map((player) => (
            <div key={player.id} className={styles.playerInput}>
              <Input
                placeholder={`Player ${player.id} name`}
                value={player.name}
                onChange={(e) => handleNameChange(player.id, e.target.value)}
              />
              {(player.name || players.length > 2) && (
                <Button
                  variant="secondary"
                  onClick={() => handleRemovePlayer(player.id)}
                  disabled={players.length <= 1}
                  className={styles.removeButton}
                >
                  <Icon name="delete" size="small" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <Typography variant="body2" color="error" className={styles.error}>
            {error}
          </Typography>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleAddPlayer} disabled={players.length >= 6}>
            Add another player
          </Button>
        </div>
      </div>
      <Button
        variant="primary"
        onClick={handleConfirm}
        disabled={players.filter((p) => p.name.trim()).length < 2 || loading}
        className={styles.startButton}
      >
        {loading ? 'Loading Questions...' : 'Start Game'}
        <Icon name="arrowRight" className={styles.arrowIcon} />
      </Button>
    </div>
  );
};

export default PlayerManagement;
