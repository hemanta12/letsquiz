import { Question } from '../types/api.types'; // Import Question from api.types

export const distributeQuestions = (
  questionsByCategory: Record<string, Question[]>,
  totalQuestions: number
): Question[] => {
  const categories = Object.keys(questionsByCategory);
  const allQuestions: Question[] = [];

  // Collect all questions from all categories
  categories.forEach((category) => {
    allQuestions.push(...questionsByCategory[category]);
  });

  // Remove duplicates based on question ID
  const uniqueQuestions = allQuestions.filter(
    (question, index, arr) => arr.findIndex((q) => q.id === question.id) === index
  );

  // If we don't have enough unique questions, return what we have
  if (uniqueQuestions.length <= totalQuestions) {
    return shuffleArray(uniqueQuestions);
  }

  // Randomly select the requested number of questions
  const shuffled = shuffleArray([...uniqueQuestions]);
  return shuffled.slice(0, totalQuestions);
};

// Helper function to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Helper function to remove duplicate questions by ID
export const removeDuplicateQuestions = (questions: Question[]): Question[] => {
  const seen = new Set<number>();
  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }
    seen.add(question.id);
    return true;
  });
};
