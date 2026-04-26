export const LEVEL1_ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Quiz Genius'] as const;

export type Level1Difficulty = (typeof LEVEL1_ALLOWED_DIFFICULTIES)[number];

export const isLevel1Difficulty = (difficulty: string): difficulty is Level1Difficulty =>
  LEVEL1_ALLOWED_DIFFICULTIES.includes(difficulty as Level1Difficulty);
