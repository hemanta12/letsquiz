import { QuizSession } from '../types/dashboard.types';

export interface Category {
  id: number;
  name: string;
}

export interface GuestProgress {
  quizzes: number;
  totalScore: number;
  lastQuizDate: string | null;
}

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
    is_premium: boolean;
  };
}

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

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
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
  category?: number | null;
  difficulty?: string;
  limit?: number;
  count?: number; // Add count property
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
  is_group_session: boolean;
  group_players?: {
    id: number;
    name: string;
    score: number;
  }[];
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

// Interface for the data returned by the backend's QuizSessionSerializer and start_quiz_session_view
export interface BackendQuizSessionResponse {
  id: number;
  user: {
    // Assuming UserSerializer returns this structure
    id: number;
    email: string;
    is_premium: boolean;
  } | null;
  started_at: string;
  completed_at: string | null;
  score: number;
  is_group_session: boolean; // Add is_group_session field
  session_questions: {
    // Assuming QuizSessionQuestionSerializer returns this structure
    id: number;
    question: {
      // Assuming nested QuestionSerializer returns this structure
      id: number;
      category: { id: number; name: string }; // Assuming CategorySerializer
      difficulty: { id: number; label: string }; // Assuming DifficultyLevelSerializer
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
  // Add the 'questions' property to match the get_quiz_session_view response
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
    // Assuming GroupPlayerSerializer returns this structure
    id: number;
    name: string;
    score: number;
    errors: string[]; // Add errors field
  }[];
  // Additional fields added in the start_quiz_session_view
  category: string;
  difficulty: string;
  totalQuestions: number;
}
