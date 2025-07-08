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
      const response = await apiClient.get<any>(`/users/${userId}/`);

      if (!response.data || !response.data.user_id) {
        console.warn('[UserService] Received empty or invalid user profile data:', response.data);
        throw new Error('Invalid user profile data received');
      }

      if (response.data.user_id.toString() !== userId) {
        console.warn('[UserService] User ID mismatch:', {
          requested: userId,
          received: response.data.user_id,
        });
        throw new Error('User ID mismatch in profile response');
      }

      const userProfile: UserProfile = {
        id: response.data.user_id,
        email: response.data.email,
        is_premium: response.data.is_premium,
        date_joined: response.data.joined_date,
        quiz_history: [],
      };

      return userProfile;
    } catch (error: any) {
      console.error('[UserService] Error fetching user profile:', error);
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
