import apiClient from './apiClient';
import {
  UserProfile,
  FetchLeaderboardResponse,
  BackendQuizSessionResponse,
} from '../types/api.types';
import { QuizSession } from '../types/dashboard.types';

class UserService {
  async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await apiClient.get<UserProfile>(`/users/${userId}/`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async fetchLeaderboard(): Promise<FetchLeaderboardResponse> {
    try {
      const response = await apiClient.get<FetchLeaderboardResponse>('/users/leaderboard');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message);
    }
  }

  async fetchUserQuizHistory(userId: string): Promise<QuizSession[]> {
    try {
      const response = await apiClient.get<QuizSession[]>(`/quiz-session/user/${userId}/`);

      if (!response.data) {
        return [];
      }
      return response.data.map((session) => ({
        ...session,
        // Add totalQuestions if missing in response
        totalQuestions: session.total_questions || 0,
      }));
    } catch (error: any) {
      return [];
    }
  }

  async fetchQuizSessionDetails(sessionId: number): Promise<BackendQuizSessionResponse> {
    const resp = await apiClient.get<BackendQuizSessionResponse>(`/sessions/${sessionId}/`);
    return resp.data;
  }
}

const userService = new UserService();
export default userService;
