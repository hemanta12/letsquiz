import { useState } from 'react';
import { Category } from '../components/Home/CategorySelector';

export default function useHomeSettings() {
  const [selectedMode, setMode] = useState<'Solo' | 'Group'>('Solo');
  const [selectedCategory, setCategory] = useState<Category | null>(null);
  const [isMixUpMode, setMixUpMode] = useState(false);
  const [selectedDifficulty, setDifficulty] = useState('');
  const [selectedQuestionCount, setQuestionCount] = useState<number | 'custom'>(10);
  const [numberOfQuestions, setNumberOfQuestions] = useState('');
  const [inputConfirmed, setInputConfirmed] = useState(false);
  const [error, setError] = useState<string>('');

  const toggleMixUp = () => {
    setCategory(null);
    setMixUpMode((prev) => !prev);
  };

  const handlePresetSelect = (count: number | 'custom') => {
    setQuestionCount(count);
    if (count !== 'custom') {
      setNumberOfQuestions('');
      setInputConfirmed(false);
    }
  };

  const handleInputChange = (value: string) => {
    if (value === '') {
      handlePresetSelect('custom');
      setInputConfirmed(false);
      return;
    }
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) return;
    setNumberOfQuestions(value);
    setQuestionCount('custom');
    setInputConfirmed(false);
  };

  const handleInputBlur = () => {
    const num = parseInt(numberOfQuestions, 10);
    setInputConfirmed(Number.isInteger(num) && num > 0);
  };

  const resetErrors = () => setError('');

  const validate = (): boolean => {
    if (!selectedCategory && !isMixUpMode) {
      setError('Please select a category or enable Mix Up');
      return false;
    }
    if (!selectedDifficulty) {
      setError('Please select a difficulty level');
      return false;
    }
    if (selectedQuestionCount === 'custom' && (!inputConfirmed || !numberOfQuestions)) {
      setError('Number of questions must be more than 0');
      return false;
    }
    setError('');
    return true;
  };

  return {
    selectedMode,
    setMode,
    selectedCategory,
    setCategory,
    isMixUpMode,
    toggleMixUp,
    selectedDifficulty,
    setDifficulty,
    selectedQuestionCount,
    handlePresetSelect,
    numberOfQuestions,
    handleInputChange,
    handleInputBlur,
    inputConfirmed,
    error,
    resetErrors,
    validate,
  };
}
