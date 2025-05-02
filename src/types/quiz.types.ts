import { GroupGameState } from './group.types';

export interface QuizSettings {
  mode: 'Solo' | 'Group';
  category: string;
  difficulty: string;
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
}
