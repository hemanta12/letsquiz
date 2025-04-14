export interface QuizSettings {
  mode: 'Solo' | 'Group';
  category: string;
  difficulty: string;
  isMixedMode?: boolean;
}

export interface QuestionDistribution {
  [category: string]: number;
}
