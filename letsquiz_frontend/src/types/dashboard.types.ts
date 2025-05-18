export type GroupPlayer = {
  id: number;
  name: string;
  score: number;
  errors: string[]; // Add errors field
};

export type QuizSession = {
  id: number;
  score: number;
  started_at: string;
  completed_at: string | null;
  category: string;
  difficulty: string;
  is_group_session: boolean; // Add is_group_session field
  group_players?: GroupPlayer[]; // Add optional group_players field
  details: { question: string; userAnswer: string; correctAnswer: string }[];
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
  question: string;
  userAnswer: string;
  correctAnswer: string;
}

export interface SessionDetail {
  session_id: number;
  category: string;
  difficulty: string;
  score: number;
  started_at: string;
  is_group_session?: boolean; // Add optional field for group session
  group_players?: GroupPlayer[]; // Add optional field for group players
  questions: QuestionDetail[];
}
