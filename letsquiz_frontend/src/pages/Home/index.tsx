import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button } from '../../components/common';
import ModeSelector from '../../components/Home/ModeSelector';
import QuestionCountSelector from '../../components/Home/QuestionCountSelector';
import CategorySelector, { Category } from '../../components/Home/CategorySelector';
import DifficultySelector from '../../components/Home/DifficultySelector';
import useHomeSettings from '../../hooks/useHomeSettings';
import QuizService from '../../services/quizService';
import AuthService from '../../services/authService';
import { useAppSelector } from '../../hooks/reduxHooks';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fetchError, setFetchError] = useState<string>('');

  const {
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
  } = useHomeSettings();

  useEffect(() => {
    (async () => {
      try {
        const data = await QuizService.fetchCategories();
        setCategories(data);
      } catch (e: any) {
        setFetchError(e.message);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const handleContinue = async () => {
    resetErrors();
    setFetchError('');

    if (!validate()) return;

    if (selectedMode === 'Group') {
      navigate('/player-setup');
      return;
    }

    try {
      await AuthService.createGuestSession();
      const available = await QuizService.checkQuizDataAvailability(
        isMixUpMode ? null : selectedCategory?.id,
        selectedDifficulty
      );
      if (!available) {
        setFetchError('No quiz data available for the selected category and difficulty.');
        return;
      }
      navigate('/quiz');
    } catch (e: any) {
      setFetchError(e.message);
    }
  };

  if (loadingCategories) {
    return <Typography className={styles.home}>Loading categories...</Typography>;
  }

  return (
    <div className={styles.home}>
      <Typography variant="h2" className={styles.welcomeMessage}>
        Welcome to LetsQuiz
      </Typography>

      {!isAuthenticated && (
        <div className={styles.guestBanner}>
          <Typography variant="body1">
            Sign in for free to <b>Save your quiz history</b> and <b>Track your progress</b>
          </Typography>
        </div>
      )}

      {/* Section 1: Mode & Number of Questions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>1</div>
          <Typography variant="h3" className={styles.sectionTitle}>
            Select a Mode
          </Typography>
        </div>
        <div className={styles.sectionContent}>
          <ModeSelector value={selectedMode} onChange={setMode} />
          <QuestionCountSelector
            selectedCount={selectedQuestionCount}
            numberInput={numberOfQuestions}
            inputConfirmed={inputConfirmed}
            onSelectPreset={handlePresetSelect}
            onInputChange={handleInputChange}
            onInputBlur={handleInputBlur}
          />
        </div>
      </div>

      {/* Section 2: Category */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>2</div>
          <Typography variant="h3" className={styles.sectionTitle}>
            Select a Category
          </Typography>
        </div>
        <div className={styles.sectionContent}>
          <CategorySelector
            categories={categories}
            selectedCategoryId={selectedCategory?.id ?? null}
            isMixUp={isMixUpMode}
            onSelect={(cat) => setCategory(cat)}
            onMixToggle={toggleMixUp}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      {/* Section 3: Difficulty */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>3</div>
          <Typography variant="h3" className={styles.sectionTitle}>
            Select a Level
          </Typography>
        </div>
        <div className={styles.sectionContent}>
          <DifficultySelector value={selectedDifficulty} onSelect={setDifficulty} />
        </div>
      </div>

      {(error || fetchError) && (
        <Typography variant="body2" className={styles.error}>
          {error || fetchError}
        </Typography>
      )}

      <div className={styles.startQuiz}>
        <Button variant="primary" onClick={handleContinue} className={styles.continueButton}>
          Start Quiz
        </Button>
      </div>
    </div>
  );
};

export default Home;
