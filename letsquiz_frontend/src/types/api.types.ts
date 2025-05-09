import { QuizSession } from '../types/dashboard.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    is_premium: boolean;
  };
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string; // Changed from 'name' to 'username' to match backend
}

export interface SignupResponse {
  message: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface SetNewPasswordResponse {
  message: string;
}

export interface ErrorResponse {
  detail: string;
}

export interface Question {
  id: number;
  category: string;
  difficulty: string;
  question_text: string;
  correct_answer: string;
  metadata_json: any;
  is_seeded: boolean;
  is_fallback: boolean;
  created_by: number | null;

  answer_options: string[];
}

export interface FetchQuestionsRequest {
  category?: string;
  difficulty?: string;
  limit?: number;
}

export interface FetchQuestionsResponse {
  questions: Question[];
}

export interface SubmitAnswerRequest {
  quiz_session_id: number;
  question_id: number;
  selected_answer: string;
}

export interface SubmitAnswerResponse {
  is_correct: boolean;
  score: number;
  correct_answer: string;
}

export interface QuizSessionHistory {
  id: number;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  category: string;
  difficulty: string;
}

export interface UserProfile {
  id: number;
  email: string;
  is_premium: boolean;
  date_joined: string;
  quiz_history: QuizSession[];
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_score: number;
  rank: number;
}

export interface FetchLeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

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
