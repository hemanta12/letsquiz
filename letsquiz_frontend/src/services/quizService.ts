import apiClient from './apiClient';
import {
  FetchQuestionsRequest,
  FetchQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  Question,
} from '../types/api.types';
import { GroupQuizSession } from '../types/quiz.types';
import AuthService from './authService';
import { AES, enc } from 'crypto-js';
import { QuizSession } from '../types/dashboard.types';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const GROUP_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_GROUP_SIZE = 10;
const MIN_GROUP_SIZE = 2;

interface GuestAnswerSubmission extends SubmitAnswerRequest {
  correct_answer: string;
}

interface LocalQuizProgress {
  answers: Record<number, string>;
  score: number;
  completed: boolean;
  timestamp: string;
}

interface CacheEntry {
  data: Question[];
  timestamp: number;
}

interface Category {
  id: number;
  name: string;
}

const questionCache: Record<string, CacheEntry> = {};

const GUEST_QUIZ_PROGRESS = 'guestQuizProgress';
const GUEST_QUIZ_COUNT = 'guestQuizCount';

class QuizService {
  private getGuestQuizCount(): number {
    const encrypted = localStorage.getItem(GUEST_QUIZ_COUNT);
    if (!encrypted) return 0;

    try {
      const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
      return parseInt(decrypted);
    } catch {
      return 0;
    }
  }

  private incrementGuestQuizCount(): void {
    const count = this.getGuestQuizCount();
    const encrypted = AES.encrypt((count + 1).toString(), ENCRYPTION_KEY).toString();
    localStorage.setItem(GUEST_QUIZ_COUNT, encrypted);
  }

  private getGuestProgress(): Record<string, LocalQuizProgress> {
    const encrypted = localStorage.getItem(GUEST_QUIZ_PROGRESS);
    if (!encrypted) return {};

    try {
      const decrypted = AES.decrypt(encrypted, ENCRYPTION_KEY).toString(enc.Utf8);
      return JSON.parse(decrypted);
    } catch {
      return {};
    }
  }

  private saveGuestProgress(quizId: string, progress: LocalQuizProgress): void {
    const allProgress = this.getGuestProgress();
    allProgress[quizId] = progress;
    const encrypted = AES.encrypt(JSON.stringify(allProgress), ENCRYPTION_KEY).toString();
    localStorage.setItem(GUEST_QUIZ_PROGRESS, encrypted);
  }

  async fetchQuestions(params?: FetchQuestionsRequest): Promise<FetchQuestionsResponse> {
    if (AuthService.isGuestSession()) {
      const guestCount = this.getGuestQuizCount();
      const featureGates = AuthService.getGuestFeatureGates();

      if (guestCount >= featureGates.maxQuestionsPerQuiz) {
        throw new Error('Guest quiz limit reached. Please sign up to continue.');
      }
    }

    const cacheKey = `${params?.category !== undefined && params.category !== null ? params.category : 'all'}-${params?.difficulty || 'all'}`;

    try {
      // Check if data is in cache and not expired
      const cached = questionCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { questions: cached.data };
      }

      const response = await apiClient.get<Question[]>('/questions/', {
        params: {
          ...params,
          _limit: params?.limit || 10,
        },
      });
      const fetchedQuestions = response.data;

      // Store data in cache with timestamp
      questionCache[cacheKey] = {
        data: fetchedQuestions,
        timestamp: Date.now(),
      };

      return { questions: fetchedQuestions };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to fetch questions: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async fetchCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get<Category[]>('/categories/');

      if (!Array.isArray(response.data)) {
        console.error('[Quiz Service] Invalid response format - expected array:', response.data);
        throw new Error('Invalid category data format received');
      }

      return response.data.map((category) => ({
        id: Number(category.id),
        name: String(category.name),
      }));
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to fetch categories: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async checkQuizDataAvailability(
    category: number | null | undefined,
    difficulty: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.get<Question[]>('/questions/', {
        params: {
          category,
          difficulty,
          _limit: 1,
          is_seeded: true,
        },
      });
      return Array.isArray(response.data) && response.data.length > 0;
    } catch (error: any) {
      console.error('[Quiz Service] Error checking availability:', error);
      return false;
    }
  }

  async submitAnswer(
    data: SubmitAnswerRequest | GuestAnswerSubmission
  ): Promise<SubmitAnswerResponse> {
    try {
      if (AuthService.isGuestSession()) {
        if (!('correct_answer' in data)) {
          throw new Error('Guest submissions require correct_answer');
        }

        const guestData = data as GuestAnswerSubmission;
        const quizId = `guest_quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const progress = this.getGuestProgress();

        if (!guestData.question_id || !guestData.selected_answer || !guestData.correct_answer) {
          throw new Error('Invalid answer submission data');
        }

        progress[quizId] = {
          answers: {
            ...progress[quizId]?.answers,
            [guestData.question_id]: guestData.selected_answer,
          },
          score:
            (progress[quizId]?.score || 0) +
            (guestData.selected_answer === guestData.correct_answer ? 1 : 0),
          completed: false,
          timestamp: new Date().toISOString(),
        };

        this.saveGuestProgress(quizId, progress[quizId]);

        return {
          is_correct: guestData.selected_answer === guestData.correct_answer,
          score: progress[quizId].score,
          correct_answer: guestData.correct_answer,
        };
      }

      const response = await apiClient.post<SubmitAnswerResponse>('/score/', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to submit answer: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  completeGuestQuiz(quizId: string): void {
    if (AuthService.isGuestSession()) {
      const progress = this.getGuestProgress();
      if (progress[quizId]) {
        progress[quizId].completed = true;
        this.saveGuestProgress(quizId, progress[quizId]);
        this.incrementGuestQuizCount();
      }
    }
  }

  async createGroupSession(
    players: string[],
    category: string,
    difficulty: string
  ): Promise<GroupQuizSession> {
    try {
      if (!players.length || !category || !difficulty) {
        throw new Error('Invalid group session data');
      }

      if (players.length < MIN_GROUP_SIZE) {
        throw new Error(`Minimum ${MIN_GROUP_SIZE} players required for group session`);
      }

      if (players.length > MAX_GROUP_SIZE) {
        throw new Error(`Maximum ${MAX_GROUP_SIZE} players allowed per group session`);
      }

      const uniqueNames = new Set(players.map((name) => name.trim().toLowerCase()));
      if (uniqueNames.size !== players.length) {
        throw new Error('All players must have unique names');
      }

      const session = {
        players: players.map((name, index) => ({
          id: index + 1,
          name: name.trim(),
          score: 0,
          lastActive: new Date().toISOString(),
        })),
        currentQuestion: 0,
        totalQuestions: 5,
        category,
        difficulty,
        status: 'active',
        currentPlayer: 1,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        timeoutAt: new Date(Date.now() + GROUP_SESSION_TIMEOUT).toISOString(),
      };

      const response = await apiClient.post<GroupQuizSession>('/groupQuizSessions', session);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to create group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async updateGroupSession(
    sessionId: number,
    data: Partial<GroupQuizSession>
  ): Promise<GroupQuizSession> {
    try {
      if (!sessionId || typeof sessionId !== 'number') {
        throw new Error('Invalid session ID');
      }

      const currentSession = await this.getGroupSession(sessionId);

      const timeoutAt = new Date(currentSession.timeoutAt);
      if (timeoutAt < new Date()) {
        throw new Error('Group session has timed out');
      }

      const updatedData = {
        ...data,
        lastActive: new Date().toISOString(),
        timeoutAt: new Date(Date.now() + GROUP_SESSION_TIMEOUT).toISOString(),
      };

      const response = await apiClient.patch<GroupQuizSession>(
        `/groupQuizSessions/${sessionId}`,
        updatedData
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to update group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async getGroupSession(sessionId: number): Promise<GroupQuizSession> {
    try {
      if (!sessionId || typeof sessionId !== 'number') {
        throw new Error('Invalid session ID');
      }

      const response = await apiClient.get<GroupQuizSession>(`/groupQuizSessions/${sessionId}`);
      const session = response.data;

      const timeoutAt = new Date(session.timeoutAt);
      if (timeoutAt < new Date()) {
        await this.updateGroupSession(sessionId, { status: 'completed' });
        throw new Error('Group session has timed out');
      }

      return session;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to get group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async saveQuizSession(quizSessionData: {
    questions: { id: number; selected_answer: string }[];
    score: number;
    category_id: number | null | undefined;
    difficulty: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post('/quiz-sessions/', quizSessionData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      throw new Error(
        `Failed to save quiz session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async fetchUserSessions(userId: number): Promise<QuizSession[]> {
    // Tell TypeScript we expect a paginated shape
    const resp = await apiClient.get<{ results: QuizSession[] }>(`/users/${userId}/sessions/`);
    return resp.data.results;
  }
}

export default new QuizService();
