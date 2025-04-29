import { QuizSession } from '../types/dashboard.types';

export const dummySessions: QuizSession[] = [
  // History Category
  ...Array.from({ length: 3 }, (_, idx) => ({
    id: idx + 1,
    score: Math.floor(Math.random() * 5 + 5),
    time: new Date(Date.now() - idx * 86400000).toLocaleString(),
    category: 'History',
    level: 'Easy',
    details: [
      { question: `History Easy Q${idx + 1}`, userAnswer: 'Answer A', correctAnswer: 'Answer A' },
      { question: `History Easy Q${idx + 2}`, userAnswer: 'Answer B', correctAnswer: 'Answer B' },
    ],
  })),
  // Science Category
  ...Array.from({ length: 4 }, (_, idx) => ({
    id: idx + 8,
    score: Math.floor(Math.random() * 5 + 4),
    time: new Date(Date.now() - (idx + 7) * 86400000).toLocaleString(),
    category: 'Science',
    level: ['Easy', 'Medium', 'Quiz Genius'][idx % 3],
    details: [
      { question: `Science Q${idx + 1}`, userAnswer: 'Answer I', correctAnswer: 'Answer I' },
      { question: `Science Q${idx + 2}`, userAnswer: 'Answer J', correctAnswer: 'Answer K' },
    ],
  })),
  // Geography Category
  ...Array.from({ length: 3 }, (_, idx) => ({
    id: idx + 12,
    score: Math.floor(Math.random() * 4 + 6), // 6-10 range
    time: new Date(Date.now() - (idx + 10) * 86400000).toLocaleString(),
    category: 'Geography',
    level: 'Easy',
    details: [
      { question: `Geography Easy Q${idx + 1}`, userAnswer: 'Paris', correctAnswer: 'Paris' },
      { question: `Geography Easy Q${idx + 2}`, userAnswer: 'Pacific', correctAnswer: 'Pacific' },
    ],
  })),
  ...Array.from({ length: 2 }, (_, idx) => ({
    id: idx + 15,
    score: Math.floor(Math.random() * 3 + 5), // 5-8 range
    time: new Date(Date.now() - (idx + 13) * 86400000).toLocaleString(),
    category: 'Geography',
    level: 'Medium',
    details: [
      {
        question: `Geography Medium Q${idx + 1}`,
        userAnswer: 'Himalayas',
        correctAnswer: 'Himalayas',
      },
      { question: `Geography Medium Q${idx + 2}`, userAnswer: 'Amazon', correctAnswer: 'Nile' },
    ],
  })),
  // Additional History sessions with Quiz Genius level
  ...Array.from({ length: 2 }, (_, idx) => ({
    id: idx + 17,
    score: Math.floor(Math.random() * 3 + 3), // 3-6 range for harder difficulty
    time: new Date(Date.now() - (idx + 15) * 86400000).toLocaleString(),
    category: 'History',
    level: 'Quiz Genius',
    details: [
      {
        question: `History Genius Q${idx + 3}`,
        userAnswer: 'Byzantine Empire',
        correctAnswer: 'Byzantine Empire',
      },
      { question: `History Genius Q${idx + 4}`, userAnswer: '1453', correctAnswer: '1453' },
    ],
  })),
  // Additional Science sessions with varied levels
  ...Array.from({ length: 3 }, (_, idx) => ({
    id: idx + 19,
    score: Math.floor(Math.random() * 4 + 4), // 4-8 range
    time: new Date(Date.now() - (idx + 17) * 86400000).toLocaleString(),
    category: 'Science',
    level: ['Medium', 'Quiz Genius', 'Easy'][idx % 3],
    details: [
      { question: `Science Advanced Q${idx + 3}`, userAnswer: 'Quantum', correctAnswer: 'Quantum' },
      { question: `Science Advanced Q${idx + 4}`, userAnswer: 'DNA', correctAnswer: 'RNA' },
    ],
  })),
];
