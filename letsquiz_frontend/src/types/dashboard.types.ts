export type GroupPlayer = {
  id: number;
  name: string;
  score: number;
  errors: string[];
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
  is_group_session?: boolean;
  group_players?: GroupPlayer[];
  questions: QuestionDetail[];
  totalQuestions?: number;
}
