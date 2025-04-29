import { QuizSession, CategoryStats } from '../types/dashboard.types';

export const calculateCategoryStats = (sessions: QuizSession[]): CategoryStats[] => {
  return sessions.reduce<CategoryStats[]>((acc, session) => {
    const categoryIndex = acc.findIndex((stat) => stat.category === session.category);

    if (categoryIndex === -1) {
      acc.push({
        category: session.category,
        totalQuizzes: 1,
        totalScore: session.score,
        byLevel: {
          [session.level]: { quizzes: 1, score: session.score },
        },
      });
    } else {
      acc[categoryIndex].totalQuizzes += 1;
      acc[categoryIndex].totalScore += session.score;

      const level = acc[categoryIndex].byLevel[session.level];
      if (level) {
        level.quizzes += 1;
        level.score += session.score;
      } else {
        acc[categoryIndex].byLevel[session.level] = {
          quizzes: 1,
          score: session.score,
        };
      }
    }
    return acc;
  }, []);
};

export const groupActivitiesByDate = (activities: QuizSession[]) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  return activities.reduce(
    (groups, activity) => {
      const activityDate = new Date(activity.time).setHours(0, 0, 0, 0);
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
    {} as Record<string, QuizSession[]>
  );
};
