import { QuizSession } from '../types/dashboard.types';

/* Base types */
export interface Category {
  id: number;
  name: string;
}

/* Guest mode types */
export interface GuestProgress {
  quizzes: number;
  totalScore: number;
  lastQuizDate: string | null;
}

/* Authentication types */
export interface LoginRequest {
  email: string;
  password: string;
  guestData?: GuestProgress;
}

export interface LoginResponse {
  access: string;
  user: {
    id: number;
    email: string;
    username: string;
    is_premium: boolean;
  };
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  success: boolean;
  token: string;
  user: UserProfile;
  message?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface SetNewPasswordResponse {
  success: boolean;
  message: string;
}

/* User statistics types */
export interface UserStatsResponse {
  overall_stats: {
    total_quizzes: number;
    total_score: number;
    accuracy: number;
  };
  category_stats: Record<
    string,
    {
      correct: number;
      total: number;
    }
  >;
  difficulty_stats: Record<
    string,
    {
      correct: number;
      total: number;
    }
  >;
}

/* Quiz types */
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
  category?: number | null;
  difficulty?: string;
  limit?: number;
  count?: number;
}

export interface FetchQuestionsResponse {
  questions: Question[];
}

/* Quiz session types */
export interface SubmitAnswerRequest {
  quiz_session_id: number;
  question_id: number;
  selected_answer: string;
  player_id?: number;
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
  is_group_session: boolean;
  group_players?: {
    id: number;
    name: string;
    score: number;
  }[];
  total_questions?: number;
}

/* User profile and leaderboard types */
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

/* Backend response types */
export interface BackendQuizSessionResponse {
  id: number;
  user: {
    id: number;
    email: string;
    is_premium: boolean;
  } | null;
  started_at: string;
  completed_at: string | null;
  score: number;
  is_group_session: boolean;
  session_questions: {
    id: number;
    question: {
      id: number;
      category: { id: number; name: string };
      difficulty: { id: number; label: string };
      question_text: string;
      correct_answer: string;
      answer_options: string[];
      metadata_json: any;
      is_seeded: boolean;
      is_fallback: boolean;
      created_by: number | null;
    };
    selected_answer: string | null;
    is_correct: boolean;
    answered_at: string | null;
  }[];
  questions: {
    id: number;
    text: string;
    options: string[];
    selected_answer: string | null;
    correct_answer: string;
    category: string;
    difficulty: string;
    is_correct: boolean | null;
    answered_at: string | null;
  }[];
  group_players: {
    id: number;
    name: string;
    score: number;
    errors: string[];
    answers: string[];
    correct_answers: Record<string, boolean>;
  }[];
  category: string;
  difficulty: string;
  totalQuestions: number;
}
