export const LEVEL1_CATEGORIES = [
  { id: 1, name: 'Science' },
  { id: 2, name: 'History' },
  { id: 3, name: 'Geography' },
] as const;

export const LEVEL1_ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Quiz Genius'] as const;

export type Level1Difficulty = (typeof LEVEL1_ALLOWED_DIFFICULTIES)[number];

export const isLevel1Difficulty = (difficulty: string): difficulty is Level1Difficulty =>
  LEVEL1_ALLOWED_DIFFICULTIES.includes(difficulty as Level1Difficulty);
