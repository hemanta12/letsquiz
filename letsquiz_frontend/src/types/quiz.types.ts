import { GroupGameState } from './group.types';

export interface QuizSettings {
  mode: 'Solo' | 'Group';
  category: string;
  categoryId?: number | null;
  difficulty: string;
  numberOfQuestions: number;
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
  errors: string[];
  answers?: string[];
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

export interface BaseQuestionProps {
  question: string;
  options: string[];
  selectedAnswer?: string;
  showFeedback: boolean;
  correctAnswer: string;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
  playerId?: string;
}
