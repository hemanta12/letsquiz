import apiClient from './apiClient';
import {
  UserProfile,
  FetchLeaderboardResponse,
  BackendQuizSessionResponse,
} from '../types/api.types';
import { QuizSession } from '../types/dashboard.types';
import AuthService from './authService';

interface GuestQuizHistory {
  quizId: string;
  category: string;
  difficulty: string;
  score: number;
  completedAt: string;
  totalQuestions: number;
}

interface GuestToUserData {
  quizHistory: GuestQuizHistory[];
  progress: {
    totalScore: number;
    quizzesCompleted: number;
    lastQuizDate: string | null;
  };
}

interface TransferredData {
  quizHistory: GuestQuizHistory[];
  progress: {
    totalScore: number;
    quizzesCompleted: number;
    lastQuizDate: string | null;
  };
}

interface MigrationProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  error?: string;
}

interface QuizHistoryResponse {
  results: QuizSession[];
}

class UserService {
  private migrationProgress: MigrationProgress = {
    status: 'pending',
    currentStep: '',
    totalSteps: 4,
    completedSteps: 0,
  };

  getMigrationProgress(): MigrationProgress {
    return { ...this.migrationProgress };
  }

  private validateGuestData(guestData: GuestToUserData): boolean {
    try {
      if (!Array.isArray(guestData.quizHistory)) {
        throw new Error('Quiz history must be an array');
      }

      for (const quiz of guestData.quizHistory) {
        if (!quiz.quizId || typeof quiz.score !== 'number' || !quiz.completedAt) {
          throw new Error('Invalid quiz history entry');
        }
      }

      if (
        typeof guestData.progress.totalScore !== 'number' ||
        typeof guestData.progress.quizzesCompleted !== 'number'
      ) {
        throw new Error('Invalid progress data');
      }

      return true;
    } catch (error) {
      console.error('Data validation failed:', error);
      return false;
    }
  }

  private async verifyTransferredData(
    userId: string,
    originalData: GuestToUserData
  ): Promise<boolean> {
    try {
      const response = await apiClient.get<TransferredData>(`/users/${userId}/verify-transfer`);
      const transferredData = response.data;

      if (transferredData.quizHistory.length !== originalData.quizHistory.length) {
        return false;
      }

      if (
        transferredData.progress.totalScore !== originalData.progress.totalScore ||
        transferredData.progress.quizzesCompleted !== originalData.progress.quizzesCompleted
      ) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Data verification failed:', error);
      return false;
    }
  }

  async transferGuestData(userId: string): Promise<void> {
    try {
      if (!AuthService.isGuestSession()) {
        return;
      }

      this.migrationProgress.status = 'in_progress';
      this.migrationProgress.currentStep = 'Preparing data';
      this.migrationProgress.completedSteps = 0;

      const guestProgress = localStorage.getItem('guestProgress');
      const guestQuizzes = localStorage.getItem('guestQuizProgress');

      if (!guestProgress && !guestQuizzes) {
        this.migrationProgress.status = 'completed';
        return;
      }

      const guestData: GuestToUserData = {
        quizHistory: [],
        progress: {
          totalScore: 0,
          quizzesCompleted: 0,
          lastQuizDate: null,
        },
      };

      if (guestQuizzes) {
        try {
          const quizzes = JSON.parse(guestQuizzes);
          guestData.quizHistory = Object.entries(quizzes).map(([quizId, data]: [string, any]) => ({
            quizId,
            category: data.category || 'General',
            difficulty: data.difficulty || 'Medium',
            score: Number(data.score) || 0,
            completedAt: data.timestamp,
            totalQuestions: Object.keys(data.answers || {}).length,
          }));
        } catch (error) {
          throw new Error('Failed to process quiz history');
        }
      }

      if (guestProgress) {
        try {
          const progress = JSON.parse(guestProgress);
          guestData.progress = {
            totalScore: Number(progress.totalScore) || 0,
            quizzesCompleted: Number(progress.quizzes) || 0,
            lastQuizDate: progress.lastQuizDate,
          };
        } catch (error) {
          throw new Error('Failed to process progress data');
        }
      }

      this.migrationProgress.currentStep = 'Validating data';
      this.migrationProgress.completedSteps++;

      if (!this.validateGuestData(guestData)) {
        throw new Error('Data validation failed');
      }

      this.migrationProgress.currentStep = 'Transferring data';
      this.migrationProgress.completedSteps++;

      await apiClient.post(`/users/${userId}/transfer-guest-data`, guestData);

      this.migrationProgress.currentStep = 'Verifying transfer';
      this.migrationProgress.completedSteps++;

      const isVerified = await this.verifyTransferredData(userId, guestData);
      if (!isVerified) {
        throw new Error('Data verification failed');
      }

      this.migrationProgress.currentStep = 'Cleaning up';
      this.migrationProgress.completedSteps++;

      const backupKey = `guest_data_backup_${Date.now()}`;
      localStorage.setItem(
        backupKey,
        JSON.stringify({
          progress: guestProgress,
          quizzes: guestQuizzes,
        })
      );

      AuthService.clearGuestSession();

      this.migrationProgress.status = 'completed';
    } catch (error: any) {
      this.migrationProgress.status = 'failed';
      this.migrationProgress.error = error.message;
      console.error('Failed to transfer guest data:', error);
      throw new Error(`Failed to transfer guest data: ${error.message}`);
    }
  }

  async fetchUserProfile(userId: string): Promise<UserProfile> {
    try {
      console.log('[User Service] Attempting to fetch profile for user:', userId);
      const response = await apiClient.get<UserProfile>(`/users/${userId}/`);
      console.log('[User Service] Successfully fetched profile:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[User Service] Failed to fetch profile:', error);
      console.error('[User Service] Error details:', {
        response: error.response,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async fetchLeaderboard(): Promise<FetchLeaderboardResponse> {
    try {
      console.log('[User Service] Fetching leaderboard');
      const response = await apiClient.get<FetchLeaderboardResponse>('/users/leaderboard');
      return response.data;
    } catch (error: any) {
      console.error('[User Service] Failed to fetch leaderboard:', error);
      throw new Error(error.response?.data?.detail || error.message);
    }
  }

  async fetchUserQuizHistory(userId: string): Promise<QuizSession[]> {
    try {
      console.log('[User Service] Fetching quiz history for user:', userId);
      if (AuthService.isGuestSession()) {
        const guestQuizzes = localStorage.getItem('guestQuizProgress');
        if (!guestQuizzes) return [];

        const quizzes = JSON.parse(guestQuizzes);
        return Object.entries(quizzes).map(([quizId, data]: [string, any]) => ({
          id: Number(quizId),
          category: data.category || 'General',
          difficulty: data.difficulty || 'Medium',
          score: Number(data.score) || 0,
          started_at: data.startTime || data.timestamp,
          completed_at: data.timestamp,
          is_group_session: false, // Add is_group_session for guest sessions
          group_players: [], // Add empty group_players array for guest sessions
          details: Object.entries(data.answers || {}).map(([question, answer]: [string, any]) => ({
            question,
            userAnswer: answer.selected,
            correctAnswer: answer.correct,
          })),
        }));
      }

      const response = await apiClient.get<QuizHistoryResponse>(`/users/${userId}/sessions/`);
      console.log('[User Service] Quiz history response:', response.data);

      if (!response.data) {
        console.error('[User Service] Quiz history response data is undefined');
        return [];
      }
      const raw = response.data?.results;

      if (!Array.isArray(response.data.results)) {
        console.error('[User Service] Quiz history results is not an array:', response.data);
        return [];
      }

      return raw.map((session) => ({
        id: session.id,
        category: session.category ?? 'General',
        difficulty: session.difficulty ?? 'Medium',
        score: Number(session.score) || 0,
        started_at: session.started_at || new Date().toISOString(),
        completed_at: session.completed_at || null,
        is_group_session: session.is_group_session ?? false,
        group_players: session.group_players ?? [],
        details: Array.isArray(session.details)
          ? session.details.map((d: any) => ({
              question: d.question_text ?? d.userAnswer ?? '',
              userAnswer: d.selected_answer ?? d.userAnswer ?? '',
              correctAnswer: d.correct_answer ?? d.correctAnswer ?? '',
            }))
          : [],
      }));
    } catch (error: any) {
      console.error('[User Service] Failed to fetch quiz history:', error);
      console.error('[User Service] Error details:', {
        response: error.response,
        message: error.message,
        stack: error.stack,
      });
      return [];
    }
  }

  async fetchQuizSessionDetails(sessionId: number): Promise<BackendQuizSessionResponse> {
    const resp = await apiClient.get<BackendQuizSessionResponse>(`/sessions/${sessionId}/`);
    return resp.data;
  }
}

export default new UserService();
