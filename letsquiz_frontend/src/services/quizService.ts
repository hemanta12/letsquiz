import apiClient from './apiClient';
import {
  FetchQuestionsRequest,
  FetchQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  Question,
  BackendQuizSessionResponse,
  Category,
} from '../types/api.types';
import { GroupQuizSession } from '../types/quiz.types';
import AuthService from './authService';
import { AES, enc } from 'crypto-js';
import { QuizSession } from '../types/dashboard.types';

/* Constants for caching and session management */
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

/* In-memory cache for optimizing API calls */
const questionCache: Record<string, CacheEntry> = {};
const categoriesCache: { data: Category[]; timestamp: number } | null = null;

const GUEST_QUIZ_PROGRESS = 'guestQuizProgress';
const GUEST_QUIZ_COUNT = 'guestQuizCount';

class QuizService {
  /* Guest session management methods */
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

  /* Encrypted local storage operations for guest progress */
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

  /* Question fetching with caching and guest limits */
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
      const cached = questionCache[cacheKey];
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { questions: cached.data };
      }

      const response = await apiClient.get<Question[]>('/questions/', {
        params: {
          ...params,
          _limit: params?.count || 10,
        },
      });
      const fetchedQuestions = response.data;

      questionCache[cacheKey] = {
        data: fetchedQuestions,
        timestamp: Date.now(),
      };

      return { questions: fetchedQuestions };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch questions: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  /* Category fetching with in-memory caching */
  async fetchCategories(): Promise<Category[]> {
    if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_DURATION) {
      return categoriesCache.data;
    }

    try {
      const response = await apiClient.get<Category[]>('/categories/');

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid category data format received');
      }

      const fetchedCategories = response.data.map((category) => ({
        id: Number(category.id),
        name: String(category.name),
      }));

      Object.assign(categoriesCache || {}, {
        data: fetchedCategories,
        timestamp: Date.now(),
      });

      return fetchedCategories;
    } catch (error: any) {
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
    } catch {
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

  /* Group session management with validation */
  async createGroupSession(
    players: string[],
    categoryId: number | null | undefined,
    difficultyId: number,
    numberOfQuestions: number
  ): Promise<BackendQuizSessionResponse> {
    try {
      if (
        !players.length ||
        difficultyId === undefined ||
        difficultyId === null ||
        numberOfQuestions <= 0
      ) {
        throw new Error(
          'Invalid group session data: players, difficulty, or number of questions missing/invalid'
        );
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

      const sessionPayload = {
        category_id: categoryId,
        difficulty_id: difficultyId,
        count: numberOfQuestions,
        mode: 'group',
        players: players,
      };

      const response = await apiClient.post<BackendQuizSessionResponse>(
        '/sessions/',
        sessionPayload
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to create group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  /* Session update with timeout management */
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
        `/sessions/${sessionId}/`,
        updatedData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to update group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  /* Session retrieval with timeout check */
  async getGroupSession(sessionId: number): Promise<GroupQuizSession> {
    try {
      if (!sessionId || typeof sessionId !== 'number') {
        throw new Error('Invalid session ID');
      }

      const response = await apiClient.get<GroupQuizSession>(`/sessions/${sessionId}/`);
      const session = response.data;

      const timeoutAt = new Date(session.timeoutAt);
      if (timeoutAt < new Date()) {
        await this.updateGroupSession(sessionId, { status: 'completed' });
        throw new Error('Group session has timed out');
      }

      return session;
    } catch (error: any) {
      throw new Error(
        `Failed to get group session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  /* Quiz session operations */
  async saveQuizSession(quizSessionData: {
    questions: { id: number; selected_answer: string }[];
    score: number;
    category_id: number | null | undefined;
    difficulty: string;
    is_group_session?: boolean;
    players?: { name: string; score: number }[];
  }): Promise<any> {
    try {
      const response = await apiClient.post('/quiz-sessions/', quizSessionData);
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to save quiz session: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async fetchQuizSessionDetails(sessionId: number): Promise<BackendQuizSessionResponse> {
    const resp = await apiClient.get<BackendQuizSessionResponse>(`/sessions/${sessionId}/`);
    return resp.data;
  }

  /* Convenience method for question count */
  async fetchQuestionCount(sessionId: number): Promise<number> {
    const detail = await this.fetchQuizSessionDetails(sessionId);
    return detail.questions.length;
  }

  async fetchUserSessions(userId: number): Promise<QuizSession[]> {
    const resp = await apiClient.get<{ results: QuizSession[] }>(`/users/${userId}/sessions/`);
    return resp.data.results;
  }

  /* Error handling with specific error messages */
  deleteQuizSession = async (sessionId: number): Promise<void> => {
    try {
      if (!sessionId || typeof sessionId !== 'number') {
        throw new Error('Invalid session ID');
      }

      await apiClient.delete(`/quiz-sessions/${sessionId}/`);
    } catch (error: any) {
      const errorMap: Record<number, string> = {
        401: 'Authentication required. Please log in again.',
        403: 'You are not authorized to delete this quiz session.',
        404: 'Quiz session not found or already deleted.',
      };

      throw new Error(
        errorMap[error.response?.status] ||
          `Failed to delete quiz session: ${error.response?.data?.detail || error.message || 'An unexpected error occurred'}`
      );
    }
  };
}

export default new QuizService();
