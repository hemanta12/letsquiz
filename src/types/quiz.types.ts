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
