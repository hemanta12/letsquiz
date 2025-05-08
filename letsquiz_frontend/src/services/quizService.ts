import apiClient from './apiClient';
import {
  FetchQuestionsRequest,
  FetchQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  Question,
} from '../types/api.types';
import { GroupQuizSession } from '../types/quiz.types';

// Simple in-memory cache
const questionCache: Record<string, Question[]> = {};

class QuizService {
  async fetchQuestions(params?: FetchQuestionsRequest): Promise<FetchQuestionsResponse> {
    const cacheKey = `${params?.category || 'all'}-${params?.difficulty || 'all'}`;

    // Check if data is in cache
    if (questionCache[cacheKey]) {
      console.log(`Fetching questions from cache for key: ${cacheKey}`);
      return { questions: questionCache[cacheKey] };
    }

    console.log(`Fetching questions from API for key: ${cacheKey}`);
    try {
      const response = await apiClient.get('/questions', { params });
      const fetchedQuestions = response.data;

      // Store data in cache
      questionCache[cacheKey] = fetchedQuestions;

      return { questions: fetchedQuestions };
    } catch (error: any) {
      throw new Error(`Failed to fetch questions: ${error.message || 'An error occurred'}`);
    }
  }

  async checkQuizDataAvailability(category: string, difficulty: string): Promise<boolean> {
    try {
      const response = await apiClient.get('/questions', {
        params: { category, difficulty, _limit: 1 },
      });
      return response.data.length > 0;
    } catch (error: any) {
      console.error('Error checking quiz data availability:', error);
      return false;
    }
  }

  async submitAnswer(data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    try {
      const response = await apiClient.post('/score/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to submit answer: ${error.message || 'An error occurred'}`);
    }
  }

  async createGroupSession(
    players: string[],
    category: string,
    difficulty: string
  ): Promise<GroupQuizSession> {
    try {
      const response = await apiClient.post('/groupQuizSessions', {
        players: players.map((name, index) => ({
          id: index + 1,
          name,
          score: 0,
        })),
        currentQuestion: 0,
        totalQuestions: 5,
        category,
        difficulty,
        status: 'active',
        currentPlayer: 1,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create group session: ${error.message || 'An error occurred'}`);
    }
  }

  async updateGroupSession(
    sessionId: number,
    data: Partial<GroupQuizSession>
  ): Promise<GroupQuizSession> {
    try {
      const response = await apiClient.patch(`/groupQuizSessions/${sessionId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update group session: ${error.message || 'An error occurred'}`);
    }
  }

  async getGroupSession(sessionId: number): Promise<GroupQuizSession> {
    try {
      const response = await apiClient.get(`/groupQuizSessions/${sessionId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get group session: ${error.message || 'An error occurred'}`);
    }
  }
}

export default new QuizService();
