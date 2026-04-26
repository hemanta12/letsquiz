import { Question } from '../types/api.types'; // Import Question from api.types

export const normalizeAnswerText = (value: string): string => {
  if (!value) return '';

  return value
    .trim()
    .toLowerCase()
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const areAnswersEquivalent = (a: string, b: string): boolean =>
  normalizeAnswerText(a) === normalizeAnswerText(b);

export const normalizeQuestionText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

export const calculateQuizScore = (
  selectedAnswers: Record<number, string>,
  questions: Question[]
): number => {
  return Object.entries(selectedAnswers).reduce((total, [index, selectedAnswer]) => {
    const question = questions[Number(index)];
    if (!question || !question.correct_answer) return total;

    return total + (areAnswersEquivalent(selectedAnswer, question.correct_answer) ? 1 : 0);
  }, 0);
};

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
  const seenIds = new Set<number>();
  const seenNormalizedText = new Set<string>();

  return questions.filter((question) => {
    const normalizedText = normalizeQuestionText(question.question_text);

    if (seenIds.has(question.id) || seenNormalizedText.has(normalizedText)) {
      return false;
    }

    seenIds.add(question.id);
    seenNormalizedText.add(normalizedText);
    return true;
  });
};
