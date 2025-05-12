import { CategoryStats, QuizSessionHistory } from '../types/api.types';
import { QuizSession } from '../types/dashboard.types';

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

export const groupActivitiesByDate = (activities: QuizSession[]) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;

  return activities.reduce(
    (groups, activity) => {
      // Skip activities without completion date
      if (!activity.completed_at) {
        return groups;
      }

      const activityDate = new Date(activity.completed_at).setHours(0, 0, 0, 0);
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
