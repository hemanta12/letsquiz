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
