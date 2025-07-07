export type GroupPlayer = {
  id: number;
  name: string;
  score: number;
  errors: string[];
  answers: Array<{ question_id: number; answer: string }>;
  correct_answers?: Record<string, boolean>;
};

export type QuizSession = {
  id: number;
  score: number;
  started_at: string;
  completed_at: string | null;
  category: string;
  difficulty: string;
  is_group_session: boolean;
  group_players?: GroupPlayer[];
  details: { question: string; userAnswer: string; correctAnswer: string }[];
  total_questions: number;
};

export type CategoryStats = {
  category: string;
  totalQuizzes: number;
  totalScore: number;
  byLevel: {
    [key: string]: {
      quizzes: number;
      score: number;
    };
  };
};

export interface QuestionDetail {
  id: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  correctPlayer: string | undefined;
  correctPlayers?: string[];
}

export interface SessionDetail {
  session_id: number;
  category: string;
  difficulty: string;
  score: number;
  started_at: string;
  is_group_session?: boolean;
  group_players?: GroupPlayer[];
  questions: QuestionDetail[];
  totalQuestions?: number;
}
