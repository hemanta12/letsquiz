export interface Player {
  id: string;
  name: string;
  score: number;
  uiScore?: number;
  isCurrentTurn: boolean;
}

export interface GroupGameState {
  players: Player[];
  currentPlayerIndex: number;
  roundNumber: number;
}
