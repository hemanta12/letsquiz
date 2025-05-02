import apiClient from './apiClient';
import { UserProfile, FetchLeaderboardResponse } from '../types/api.types';

class UserService {
  async fetchUserProfile(): Promise<UserProfile> {
    // Mock: Fetch all users and return the first one as the logged-in user's profile
    const response = await apiClient.get('/users');
    // Assuming the first user in the db.json users array is the mock logged-in user
    const userProfile = response.data[0];
    if (userProfile) {
      return userProfile; // Assuming the structure matches UserProfile
    } else {
      throw new Error('Mock user profile not found');
    }
  }

  async fetchLeaderboard(): Promise<FetchLeaderboardResponse> {
    // Fetch leaderboard data from the /leaderboard endpoint
    const response = await apiClient.get('/leaderboard');
    // Assuming JSON Server returns an array of leaderboard entries at /leaderboard
    // We need to wrap it in an object with a 'leaderboard' property to match FetchLeaderboardResponse
    return { leaderboard: response.data };
  }
}

export default new UserService();
