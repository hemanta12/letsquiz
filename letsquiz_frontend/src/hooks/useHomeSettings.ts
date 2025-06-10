import { useState } from 'react';
import { Category } from '../components/Home/CategorySelector';

export default function useHomeSettings() {
  const [selectedMode, setMode] = useState<'Solo' | 'Group'>('Solo');
  const [selectedCategory, setCategory] = useState<Category | null>(null);
  const [isMixUpMode, setMixUpMode] = useState(false);
  const [selectedDifficulty, setDifficulty] = useState('');
  const [selectedQuestionCount, setQuestionCount] = useState<number>(10);
  const [error, setError] = useState<string>('');

  const toggleMixUp = () => {
    if (!isMixUpMode) {
      setCategory(null);
      setMixUpMode(true);
    }
  };

  const handleCategorySelect = (cat: Category) => {
    setMixUpMode(false);
    setCategory(cat);
  };

  const handleQuestionCountSelect = (count: number) => {
    setQuestionCount(count);
  };

  const validate = (): boolean => {
    if (!selectedCategory && !isMixUpMode) {
      setError('Please select a category or enable Mix Up');
      return false;
    }
    if (!selectedDifficulty) {
      setError('Please select a difficulty level');
      return false;
    }
    setError('');
    return true;
  };

  const resetErrors = () => setError('');

  return {
    selectedMode,
    setMode,
    selectedCategory,
    setCategory: handleCategorySelect,
    isMixUpMode,
    toggleMixUp,
    selectedDifficulty,
    setDifficulty,
    selectedQuestionCount,
    handleQuestionCountSelect,
    error,
    resetErrors,
    validate,
  };
}
