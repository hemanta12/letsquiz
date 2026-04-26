export const LEVEL1_ALLOWED_CATEGORY_IDS = [1, 2, 3] as const;

/** Canonical category list for Level 1. Single source of truth for UI and validation. */
export const LEVEL1_CATEGORIES = [
  { id: 1, name: 'Science' },
  { id: 2, name: 'History' },
  { id: 3, name: 'Geography' },
] as const;

export type Level1Category = (typeof LEVEL1_CATEGORIES)[number];

export const LEVEL1_ALLOWED_DIFFICULTIES = ['Easy', 'Medium', 'Quiz Genius'] as const;

export type Level1Difficulty = (typeof LEVEL1_ALLOWED_DIFFICULTIES)[number];

export const isLevel1CategoryId = (categoryId: number | null | undefined): boolean =>
  typeof categoryId === 'number' && LEVEL1_ALLOWED_CATEGORY_IDS.includes(categoryId as 1 | 2 | 3);

export const isLevel1Difficulty = (difficulty: string): difficulty is Level1Difficulty =>
  LEVEL1_ALLOWED_DIFFICULTIES.includes(difficulty as Level1Difficulty);

export const LEVEL1_DIFFICULTY_TO_ID: Record<Level1Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  'Quiz Genius': 3,
};
