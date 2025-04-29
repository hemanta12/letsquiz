export type QuizSession = {
  id: number;
  score: number;
  time: string;
  category: string;
  level: string;
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
