import { QuizSessionHistory } from '../types/api.types';

export const getWinnerDisplay = (
  activity: QuizSessionHistory
): { text: string; isWinner: boolean } => {
  if (
    !activity.is_group_session ||
    !activity.group_players ||
    activity.group_players.length === 0
  ) {
    return {
      text: `${activity.score ?? 0} / ${
        (activity.total_questions ?? 0) > 0 ? activity.total_questions : 'N/A'
      }`,
      isWinner: false,
    };
  }

  const sortedPlayers = [...activity.group_players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  return {
    text: winner ? `Winner: ${winner.name}` : 'No winner',
    isWinner: !!winner,
  };
};

export const getRelativeTimeGroup = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const msInDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      msInDay
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    diffDays > 1
  )
    return 'This Month';
  return 'Earlier';
};

export const formatDate = (iso: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
};
