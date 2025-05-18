import { GroupGameState } from './group.types';

export interface QuizSettings {
  mode: 'Solo' | 'Group';
  category: string;
  categoryId?: number | null;
  difficulty: string;
  numberOfQuestions: number; // Add numberOfQuestions field
  isMixedMode?: boolean;
  groupState?: GroupGameState;
}

export interface QuestionDistribution {
  [category: string]: number;
}

export interface GroupPlayer {
  id: number;
  name: string;
  score: number;
  uiScore?: number;
  errors: string[]; // Add errors field
}

export interface GroupQuizSession {
  id: number;
  players: GroupPlayer[];
  currentQuestion: number;
  totalQuestions: number;
  category: string;
  difficulty: string;
  status: 'active' | 'completed';
  currentPlayer: number;
  createdAt: string;
  lastActive: string;
  timeoutAt: string;
}
