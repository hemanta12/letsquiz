import { QuizSessionHistory } from './api.types';

export declare const getWinnerDisplay: (activity: QuizSessionHistory) => {
  text: string;
  isWinner: boolean;
};

export declare const getRelativeTimeGroup: (dateString: string) => string;
export declare const formatDate: (iso: string) => string;
