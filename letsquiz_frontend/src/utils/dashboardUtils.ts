import { CategoryStats, QuizSessionHistory } from '../types/api.types';

export const calculateCategoryStats = (
  sessions: QuizSessionHistory[] | undefined | null
): CategoryStats[] => {
  if (!sessions || !Array.isArray(sessions)) {
    return [];
  }
  return sessions
    .filter((session) => session.category !== undefined && session.category !== null)
    .reduce<CategoryStats[]>((acc, session) => {
      const sessionScore = session.score !== null ? session.score : 0;

      const categoryIndex = acc.findIndex((stat) => stat.category === session.category);

      if (categoryIndex === -1) {
        acc.push({
          category: session.category,
          totalQuizzes: 1,
          totalScore: sessionScore,
          byLevel: {
            [session.difficulty]: { quizzes: 1, score: sessionScore },
          },
        });
      } else {
        acc[categoryIndex].totalQuizzes += 1;
        acc[categoryIndex].totalScore += sessionScore;

        const level = acc[categoryIndex].byLevel[session.difficulty];
        if (level) {
          level.quizzes += 1;
          level.score += sessionScore;
        } else {
          acc[categoryIndex].byLevel[session.difficulty] = {
            quizzes: 1,
            score: sessionScore,
          };
        }
      }
      return acc;
    }, []);
};
