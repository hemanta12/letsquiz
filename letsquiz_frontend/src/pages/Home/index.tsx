import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Icon } from '../../components/common';
import ModeSelector from '../../components/Home/ModeSelector';
import QuestionCountSelector from '../../components/Home/QuestionCountSelector';
import CategorySelector from '../../components/Home/CategorySelector';
import DifficultySelector from '../../components/Home/DifficultySelector';
import useHomeSettings from '../../hooks/useHomeSettings';
import AuthService from '../../services/authService';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { setQuizSettings } from '../../store/slices/quizSlice';
import styles from './Home.module.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

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
    handleQuestionCountSelect,
    error,
    resetErrors,
    validate,
  } = useHomeSettings();

  const handleContinue = async (e?: React.MouseEvent) => {
    try {
      e?.preventDefault?.();
      resetErrors();
      setFetchError('');

      if (!validate()) {
        return;
      }

      if (selectedMode === 'Group') {
        await AuthService.createGuestSession();
        dispatch(
          setQuizSettings({
            mode: selectedMode,
            category: isMixUpMode ? 'Mix Up' : selectedCategory?.name || '',
            categoryId: isMixUpMode ? null : (selectedCategory?.id ?? null),
            difficulty: selectedDifficulty,
            numberOfQuestions: selectedQuestionCount,
          })
        );
        navigate('/player-setup');
        return;
      }

      await AuthService.createGuestSession();
      dispatch(
        setQuizSettings({
          mode: selectedMode,
          category: isMixUpMode ? 'Mix Up' : selectedCategory?.name || '',
          categoryId: isMixUpMode ? null : (selectedCategory?.id ?? null),
          difficulty: selectedDifficulty,
          numberOfQuestions: selectedQuestionCount,
        })
      );
      navigate('/quiz');
    } catch (error: any) {
      setFetchError(error.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className={styles.home}>
      <Typography variant="h1" className={styles.welcomeMessage}>
        Welcome to LetsQuiz
      </Typography>

      {!isAuthenticated && (
        <div className={styles.guestBanner}>
          <Typography variant="body1">
            <span>
              Sign in for free to <b>Save your quiz history</b> and <b>Track your progress</b>
            </span>
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
            onSelectPreset={handleQuestionCountSelect}
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
          <Icon name="arrowRight" className={styles.arrowIcon} />
        </Button>
      </div>
    </div>
  );
};

export default Home;
