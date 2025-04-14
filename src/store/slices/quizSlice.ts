import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { QuizSettings } from '../../types/quiz.types';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Quiz Genius'; // Add difficulty
}

interface QuizState {
  settings: QuizSettings;
  mode: string;
  category: string;
  difficulty: string;
  currentQuestion: number;
  questions: Question[];
  selectedAnswers: Record<number, string>;
  score: number;
}

// Modify STATIC_QUESTIONS to include difficulty
const STATIC_QUESTIONS: Record<string, Question[]> = {
  History: [
    {
      id: 'hist1',
      text: 'Who was the first president of United States of America?',
      options: ['Donald Trump', 'Barack Obama', 'George Washington', 'Abraham Lincoln'],
      correctAnswer: 'George Washington',
      difficulty: 'Easy',
    },
    {
      id: 'hist2',
      text: 'In which year did World War II end?',
      options: ['1943', '1944', '1945', '1946'],
      correctAnswer: '1945',
      difficulty: 'Medium',
    },
  ],
  Science: [
    {
      id: 'sci1',
      text: 'What is the chemical symbol for Gold?',
      options: ['Au', 'Ag', 'Fe', 'Cu'],
      correctAnswer: 'Au',
      difficulty: 'Easy',
    },
    {
      id: 'sci2',
      text: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 'Mars',
      difficulty: 'Medium',
    },
  ],
  Geography: [
    {
      id: 'geo1',
      text: 'What is the capital of Japan?',
      options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
      correctAnswer: 'Tokyo',
      difficulty: 'Easy',
    },
    {
      id: 'geo2',
      text: 'Which is the largest ocean on Earth?',
      options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
      correctAnswer: 'Pacific',
      difficulty: 'Medium',
    },
  ],
  Movies: [
    {
      id: 'mov1',
      text: 'Which film won the Academy Award for Best Picture in 2024?',
      options: ['Barbie', 'Oppenheimer', 'Poor Things', 'Killers of the Flower Moon'],
      correctAnswer: 'Oppenheimer',
      difficulty: 'Quiz Genius',
    },
    {
      id: 'mov2',
      text: 'Who played Iron Man in the Marvel Cinematic Universe?',
      options: ['Chris Evans', 'Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo'],
      correctAnswer: 'Robert Downey Jr.',
      difficulty: 'Medium',
    },
  ],
  Sports: [
    {
      id: 'spt1',
      text: 'Which country won the FIFA World Cup 2022?',
      options: ['France', 'Brazil', 'Argentina', 'Germany'],
      correctAnswer: 'Argentina',
      difficulty: 'Medium',
    },
    {
      id: 'spt2',
      text: 'In which sport is the Davis Cup awarded?',
      options: ['Football', 'Tennis', 'Cricket', 'Basketball'],
      correctAnswer: 'Tennis',
      difficulty: 'Easy',
    },
  ],
  Trivia: [
    {
      id: 'trv1',
      text: 'What is the most spoken language in the world?',
      options: ['English', 'Spanish', 'Hindi', 'Mandarin Chinese'],
      correctAnswer: 'Mandarin Chinese',
      difficulty: 'Medium',
    },
    {
      id: 'trv2',
      text: 'How many sides does a hexagon have?',
      options: ['5', '6', '7', '8'],
      correctAnswer: '6',
      difficulty: 'Easy',
    },
  ],
};

const initialState: QuizState = {
  settings: {
    mode: 'Solo',
    category: '',
    difficulty: '',
  },
  mode: 'Solo',
  category: '',
  difficulty: '',
  currentQuestion: 0,
  questions: [],
  selectedAnswers: {},
  score: 0,
};

// Add a comment for backend integration
// TODO: Remove STATIC_QUESTIONS when connecting to backend
// For now, allowing question repetition for testing purposes

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizSettings: (state, action: PayloadAction<QuizSettings>) => {
      state.settings = action.payload;
      state.mode = action.payload.mode;
      state.category = action.payload.category;
      state.difficulty = action.payload.difficulty;
    },
    setQuestions: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
    },
    selectAnswer: (state, action: PayloadAction<{ questionIndex: number; answer: string }>) => {
      state.selectedAnswers[action.payload.questionIndex] = action.payload.answer;
    },
    updateScore: (state) => {
      state.score = Object.entries(state.selectedAnswers).reduce((score, [index, answer]) => {
        return score + (answer === state.questions[Number(index)].correctAnswer ? 1 : 0);
      }, 0);
    },
    nextQuestion: (state) => {
      if (state.currentQuestion < state.questions.length - 1) {
        state.currentQuestion += 1;
      }
    },
    resetQuiz: () => initialState,
    initializeQuestions: (state, action: PayloadAction<number>) => {
      const selectedQuestions: Question[] = [];

      if (state.category === 'all') {
        // Mix Up mode - distribute evenly across categories
        const categories = Object.keys(STATIC_QUESTIONS);
        const questionsPerCategory = Math.floor(action.payload / categories.length);
        const remainder = action.payload % categories.length;

        // Filter questions by difficulty first
        categories.forEach((category) => {
          const categoryQuestions = STATIC_QUESTIONS[category].filter(
            (q) => q.difficulty === state.difficulty
          );

          for (let i = 0; i < questionsPerCategory; i++) {
            if (categoryQuestions.length > 0) {
              selectedQuestions.push(categoryQuestions[i % categoryQuestions.length]);
            }
          }
        });

        // Handle remainder
        for (let i = 0; i < remainder; i++) {
          const randomCategory = categories[Math.floor(Math.random() * categories.length)];
          const categoryQuestions = STATIC_QUESTIONS[randomCategory].filter(
            (q) => q.difficulty === state.difficulty
          );
          if (categoryQuestions.length > 0) {
            selectedQuestions.push(
              categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)]
            );
          }
        }
      } else {
        // Single category mode
        const categoryQuestions = STATIC_QUESTIONS[state.category].filter(
          (q) => q.difficulty === state.difficulty
        );

        for (let i = 0; i < action.payload; i++) {
          if (categoryQuestions.length > 0) {
            selectedQuestions.push(categoryQuestions[i % categoryQuestions.length]);
          }
        }
      }

      state.questions = selectedQuestions;
    },
  },
});

export const {
  setQuizSettings,
  setQuestions,
  selectAnswer,
  updateScore,
  nextQuestion,
  resetQuiz,
  initializeQuestions, // Add this to exports
} = quizSlice.actions;
export default quizSlice.reducer;
