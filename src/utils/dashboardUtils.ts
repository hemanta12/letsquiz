import { QuizSessionHistory, CategoryStats } from '../types/api.types'; // Import QuizSessionHistory and CategoryStats from api.types

export const calculateCategoryStats = (
  sessions: QuizSessionHistory[] | undefined | null
): CategoryStats[] => {
  if (!sessions || !Array.isArray(sessions)) {
    return []; // Return empty array if sessions is undefined, null, or not an array
  }
  return sessions.reduce<CategoryStats[]>((acc, session) => {
    // Ensure score is not null before using it
    const sessionScore = session.score !== null ? session.score : 0;

    const categoryIndex = acc.findIndex((stat) => stat.category === session.category);

    if (categoryIndex === -1) {
      acc.push({
        category: session.category,
        totalQuizzes: 1,
        totalScore: sessionScore,
        byLevel: {
          [session.difficulty]: { quizzes: 1, score: sessionScore }, // Use session.difficulty
        },
      });
    } else {
      acc[categoryIndex].totalQuizzes += 1;
      acc[categoryIndex].totalScore += sessionScore;

      const level = acc[categoryIndex].byLevel[session.difficulty]; // Use session.difficulty
      if (level) {
        level.quizzes += 1;
        level.score += sessionScore;
      } else {
        acc[categoryIndex].byLevel[session.difficulty] = {
          // Use session.difficulty
          quizzes: 1,
          score: sessionScore,
        };
      }
    }
    return acc;
  }, []);
};

export const groupActivitiesByDate = (activities: QuizSessionHistory[]) => {
  // Use QuizSessionHistory[]
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  return activities.reduce(
    (groups, activity) => {
      const activityDate = new Date(activity.started_at).setHours(0, 0, 0, 0); // Use activity.started_at
      let group =
        activityDate === today
          ? 'today'
          : activityDate === yesterday
            ? 'yesterday'
            : activityDate > today - 7 * 86400000
              ? 'thisWeek'
              : 'older';

      return {
        ...groups,
        [group]: [...(groups[group] || []), activity],
      };
    },
    {} as Record<string, QuizSessionHistory[]> // Use QuizSessionHistory[]
  );
};
