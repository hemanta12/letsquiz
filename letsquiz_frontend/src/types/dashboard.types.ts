export type QuizSession = {
  id: number;
  score: number;
  started_at: string;
  completed_at: string | null;
  category: string;
  difficulty: string;
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
  questions: QuestionDetail[];
}
