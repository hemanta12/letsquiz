import apiClient from './apiClient';
import { UserProfile, FetchLeaderboardResponse } from '../types/api.types';
import { QuizSession } from '../types/dashboard.types';

class UserService {
  async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      const userProfile = response.data;
      if (userProfile) {
        return userProfile;
      } else {
        throw new Error(`User profile with ID ${userId} not found`);
      }
    } catch (error: any) {
      throw new Error(
        `Failed to fetch user profile for ID ${userId}: ${error.message || 'An error occurred'}`
      );
    }
  }

  async fetchLeaderboard(): Promise<FetchLeaderboardResponse> {
    try {
      const response = await apiClient.get('/leaderboard');
      return { leaderboard: response.data };
    } catch (error: any) {
      throw new Error(`Failed to fetch leaderboard: ${error.message || 'An error occurred'}`);
    }
  }

  async fetchDetailedQuizSessionsByIds(sessionIds: number[]): Promise<QuizSession[]> {
    try {
      const response = await apiClient.get('/quizSessions');

      const detailedSessions = response.data.filter((session: QuizSession) => {
        const sessionIdNumber = Number(session.id);
        return sessionIds.includes(sessionIdNumber);
      });
      return detailedSessions;
    } catch (error: any) {
      console.error('UserService.fetchDetailedQuizSessionsByIds: API call failed', error);
      throw new Error(`Failed to fetch quiz sessions: ${error.message || 'An error occurred'}`);
    }
  }

  async fetchUserQuizHistory(userId: string): Promise<QuizSession[]> {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data.quiz_history;
    } catch (error: any) {
      console.error('UserService.fetchUserQuizHistory: API call failed', error);
      throw new Error(`Failed to fetch quiz history: ${error.message || 'An error occurred'}`);
    }
  }
}

export default new UserService();
