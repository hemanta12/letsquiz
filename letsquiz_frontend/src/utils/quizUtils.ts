import { Question } from '../types/api.types'; // Import Question from api.types

export const distributeQuestions = (
  questionsByCategory: Record<string, Question[]>,
  totalQuestions: number
): Question[] => {
  const categories = Object.keys(questionsByCategory);
  const questionsPerCategory = Math.floor(totalQuestions / categories.length);
  const remainder = totalQuestions % categories.length;

  let distributedQuestions: Question[] = [];

  // First, take equal numbers from each category
  categories.forEach((category) => {
    const categoryQuestions = questionsByCategory[category];
    // Allow repeating questions if not enough in category
    for (let i = 0; i < questionsPerCategory; i++) {
      const questionIndex = i % categoryQuestions.length;
      distributedQuestions.push(categoryQuestions[questionIndex]);
    }
  });

  // Handle remainder by taking random questions
  for (let i = 0; i < remainder; i++) {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryQuestions = questionsByCategory[randomCategory];
    const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
    distributedQuestions.push(categoryQuestions[randomIndex]);
  }

  return distributedQuestions;
};
