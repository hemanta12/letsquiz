import apiClient from './apiClient';
import {
  FetchQuestionsRequest,
  FetchQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  AnswerValidationResponse,
  Question,
  BackendQuizSessionResponse,
  Category,
} from '../types/api.types';
import { GroupQuizSession } from '../types/quiz.types';
import AuthService from './authService';
import { AES, enc } from 'crypto-js';
import { QuizSession } from '../types/dashboard.types';
import { removeDuplicateQuestions } from '../utils/quizUtils';

import {
  GROUP_SESSION_TIMEOUT_MS,
  CATEGORY_CACHE_TTL_MS as SERVICE_CATEGORY_CACHE_TTL,
} from '../constants/timings';

/* Constants for session management */
const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'default-key';
// Level 1 cap: keep group sessions at 2-6 players for stable local gameplay.
// If product scope changes in later levels, update this cap together with backend validation.
const MAX_GROUP_SIZE = 6;
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

const GUEST_QUIZ_PROGRESS = 'guestQuizProgress';
const GUEST_QUIZ_COUNT = 'guestQuizCount';
const CATEGORY_CACHE_KEY = 'quizCategoriesCacheV1';
const CATEGORY_CACHE_TTL_MS = SERVICE_CATEGORY_CACHE_TTL;

interface CachedCategoriesPayload {
  categories: Category[];
  cachedAt: number;
}

class QuizService {
  async validateAnswer(
    questionId: number,
    selectedAnswer: string
  ): Promise<AnswerValidationResponse> {
    const response = await apiClient.post<AnswerValidationResponse>(
      `/questions/${questionId}/validate/`,
      { selected_answer: selectedAnswer }
    );
    return response.data;
  }

  private readCachedCategories(): Category[] | null {
    const raw = localStorage.getItem(CATEGORY_CACHE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as CachedCategoriesPayload;
      if (!Array.isArray(parsed.categories) || typeof parsed.cachedAt !== 'number') {
        return null;
      }

      if (Date.now() - parsed.cachedAt > CATEGORY_CACHE_TTL_MS) {
        return null;
      }

      return parsed.categories;
    } catch {
      return null;
    }
  }

  private writeCachedCategories(categories: Category[]): void {
    const payload: CachedCategoriesPayload = {
      categories,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(payload));
  }

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

  /* Question fetching with guest limits - caching handled by Redis backend */
  async fetchQuestions(params?: FetchQuestionsRequest): Promise<FetchQuestionsResponse> {
    if (AuthService.isGuestSession()) {
      const guestCount = this.getGuestQuizCount();
      const featureGates = AuthService.getGuestFeatureGates();

      if (guestCount >= featureGates.maxQuestionsPerQuiz) {
        throw new Error('Guest quiz limit reached. Please sign up to continue.');
      }
    }

    try {
      const { count, ...rest } = params ?? {};
      const response = await apiClient.get<Question[]>('/questions/', {
        params: {
          ...rest,
          _limit: count || 10,
        },
      });
      const fetchedQuestions = removeDuplicateQuestions(response.data);

      if ((count || 10) > fetchedQuestions.length) {
        throw new Error(
          `Only ${fetchedQuestions.length} unique questions are available for this selection. Please reduce the question count or choose a different category/difficulty.`
        );
      }

      return { questions: fetchedQuestions.slice(0, count || 10) };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch questions: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  /* Category fetching - caching handled by Redis backend */
  async fetchCategories(): Promise<Category[]> {
    const cached = this.readCachedCategories();
    if (cached) {
      return cached;
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

      this.writeCachedCategories(fetchedCategories);
      return fetchedCategories;
    } catch (error: any) {
      // If network fetch fails but we have stale-but-usable cache, prefer availability.
      const fallbackRaw = localStorage.getItem(CATEGORY_CACHE_KEY);
      if (fallbackRaw) {
        try {
          const parsed = JSON.parse(fallbackRaw) as CachedCategoriesPayload;
          if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
            return parsed.categories;
          }
        } catch {
          // Ignore parse errors and surface the original fetch error below.
        }
      }

      throw new Error(
        `Failed to fetch categories: ${error.response?.data?.detail || error.message || 'An error occurred'}`
      );
    }
  }

  async checkQuizDataAvailability(
    category: number | null | undefined,
    difficulty: string,
    requiredCount: number
  ): Promise<{ isEnough: boolean; available: number }> {
    try {
      const response = await apiClient.get<Question[]>('/questions/', {
        params: {
          category,
          difficulty,
          _limit: requiredCount,
          is_seeded: true,
        },
      });
      if (!Array.isArray(response.data)) {
        return { isEnough: false, available: 0 };
      }

      const uniqueQuestions = removeDuplicateQuestions(response.data);
      return {
        isEnough: uniqueQuestions.length >= requiredCount,
        available: uniqueQuestions.length,
      };
    } catch {
      return { isEnough: false, available: 0 };
    }
  }

  async submitAnswer(
    data: SubmitAnswerRequest | GuestAnswerSubmission,
    playerId?: number
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

      const payload = {
        ...data,
        ...(playerId !== undefined ? { player_id: playerId } : {}),
      };

      const response = await apiClient.post<SubmitAnswerResponse>(
        `/sessions/${data.quiz_session_id}/answer/`,
        payload
      );
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
    difficulty: string,
    numberOfQuestions: number
  ): Promise<BackendQuizSessionResponse> {
    try {
      if (!players.length || !difficulty || numberOfQuestions <= 0) {
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
        difficulty,
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
        timeoutAt: new Date(Date.now() + GROUP_SESSION_TIMEOUT_MS).toISOString(),
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
    correctnessData?: { questionId: string; playerId: number }[];
  }): Promise<any> {
    try {
      // Only require players for group sessions
      if (
        !quizSessionData.questions ||
        (quizSessionData.is_group_session && !quizSessionData.players)
      ) {
        throw new Error('Invalid quiz session payload');
      }

      // Transform correctness data to snake_case
      const correctnessPayload =
        quizSessionData.correctnessData?.map((item) => ({
          question_id: item.questionId,
          player_id: item.playerId,
        })) || [];

      // Build payload with standardized correctness data
      const payload = {
        ...quizSessionData,
        correctness: correctnessPayload,
        has_correctness: correctnessPayload.length > 0,
      };

      const response = await apiClient.post('/quiz-sessions/', payload);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        AuthService.logout();
      }

      const saveErrorMap: Record<number, string> = {
        400: 'Could not save quiz session due to invalid session payload.',
        401: 'Authentication required. Please log in again to save your progress.',
        403: 'You are not authorized to save this quiz session.',
        500: 'Server error while saving quiz session. Please try again.',
      };

      throw new Error(
        saveErrorMap[error.response?.status] ||
          error.response?.data?.detail ||
          error.message ||
          'Failed to save quiz session.'
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
    const resp = await apiClient.get<QuizSession[]>(`/users/${userId}/sessions/`);
    return resp.data;
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

const quizService = new QuizService();
export default quizService;
