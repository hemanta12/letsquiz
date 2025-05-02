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
    // Change endpoint to /questions and pass params for filtering
    const response = await apiClient.get('/questions', { params });
    // Assuming JSON Server returns an array of questions directly for GET /questions
    const fetchedQuestions = response.data; // JSON Server returns array directly

    // Store data in cache
    questionCache[cacheKey] = fetchedQuestions;

    return { questions: fetchedQuestions };
  }

  async submitAnswer(data: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
    // Assuming submitting an answer involves updating a quiz session or score
    // This endpoint might need adjustment based on your db.json structure for scores/sessions
    const response = await apiClient.post('/score/', data); // Keep as POST to /score for now based on previous plan
    return response.data;
  }

  async createGroupSession(
    players: string[],
    category: string,
    difficulty: string
  ): Promise<GroupQuizSession> {
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
  }

  async updateGroupSession(
    sessionId: number,
    data: Partial<GroupQuizSession>
  ): Promise<GroupQuizSession> {
    const response = await apiClient.patch(`/groupQuizSessions/${sessionId}`, data);
    return response.data;
  }

  async getGroupSession(sessionId: number): Promise<GroupQuizSession> {
    const response = await apiClient.get(`/groupQuizSessions/${sessionId}`);
    return response.data;
  }
}

export default new QuizService();
