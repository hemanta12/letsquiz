export interface Player {
  id: string;
  name: string;
  score: number;
  uiScore?: number;
  isCurrentTurn: boolean;
  errors: string[]; // Add errors field
}

export interface GroupGameState {
  players: Player[];
  currentPlayerIndex: number;
  roundNumber: number;
}
