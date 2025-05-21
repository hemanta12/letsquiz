import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Icon, Input } from '../../components/common';
import { PlayerManagement } from '../../components/GroupMode/PlayerManagement/index';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import {
  setQuizSettings,
  startGroupQuiz,
  fetchCategoriesThunk,
} from '../../store/slices/quizSlice';
import QuizService from '../../services/quizService';
import AuthService from '../../services/authService';
import styles from './Home.module.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { categories, loadingCategories, categoryError } = useAppSelector((state) => state.quiz);

  const [selectedMode, setSelectedMode] = useState<'Solo' | 'Group'>('Solo');
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(
    null
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [numberOfQuestions, setNumberOfQuestions] = useState('');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | 'custom'>(10);
  const [inputConfirmed, setInputConfirmed] = useState(false);
  const [isMixUpMode, setIsMixUpMode] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [noDataError, setNoDataError] = useState(false);

  useEffect(() => {
    if (categories.length === 0 && !loadingCategories && !categoryError) {
      dispatch(fetchCategoriesThunk());
    }
  }, [categories.length, loadingCategories, categoryError, dispatch]);

  const handleMixUp = useCallback(() => {
    setSelectedCategory(null);
    setIsMixUpMode((prev) => !prev);
  }, []);

  const handleCategorySelect = (category: { id: number; name: string }) => {
    setSelectedCategory(category);
    setIsMixUpMode(false);
  };

  const handleModeSelect = (mode: 'Solo' | 'Group') => {
    setSelectedMode(mode);
  };

  const validateSelections = () => {
    if (!selectedMode) {
      setSelectionError('Please select a mode');
      return false;
    }
    if (!selectedCategory && !isMixUpMode) {
      setSelectionError('Please select a category');
      return false;
    }
    if (!selectedDifficulty) {
      setSelectionError('Please select a difficulty level');
      return false;
    }
    if (
      selectedQuestionCount === 'custom' &&
      numberOfQuestions !== '' &&
      (parseInt(numberOfQuestions, 10) <= 0 || !Number.isInteger(parseInt(numberOfQuestions, 10)))
    ) {
      setSelectionError('Number of questions must be a positive integer');
      return false;
    }
    setSelectionError('');
    return true;
  };

  const handleNumberOfQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setNumberOfQuestions('');
      setSelectedQuestionCount('custom');
      setInputConfirmed(false);
      return;
    }
    const numValue = Number(value);
    if (!Number.isInteger(numValue) || numValue < 1) {
      // Ignore invalid input, do not update state
      return;
    }
    setNumberOfQuestions(value);
    setSelectedQuestionCount('custom');
    setInputConfirmed(false);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(numberOfQuestions, 10);
    if (Number.isInteger(numValue) && numValue > 0) {
      setInputConfirmed(true);
    } else {
      setInputConfirmed(false);
    }
  };

  const handlePredefinedQuestionSelect = (count: number) => {
    setNumberOfQuestions('');
    setSelectedQuestionCount(count);
  };

  const handleContinue = async () => {
    setNoDataError(false);
    setSelectionError('');
    if (!validateSelections()) return;

    if (!isAuthenticated) {
      try {
        await AuthService.createGuestSession();
      } catch (error) {
        console.error('Error creating guest session:', error);
        setSelectionError('Failed to create guest session. Please try again.');
        return;
      }
    }

    const categoryId = isMixUpMode ? null : selectedCategory?.id;

    try {
      const isDataAvailable = await QuizService.checkQuizDataAvailability(
        categoryId,
        selectedDifficulty
      );
      if (isDataAvailable) {
        dispatch(
          setQuizSettings({
            mode: selectedMode,
            category: selectedCategory?.name || 'Mixed',
            categoryId: categoryId,
            difficulty: selectedDifficulty,
            numberOfQuestions: parseInt(numberOfQuestions, 10) || 10,
            isMixedMode: isMixUpMode,
          })
        );
        navigate(selectedMode === 'Group' ? '/player-setup' : '/quiz');
      } else {
        setNoDataError(true);
      }
    } catch (error) {
      console.error('Error checking quiz data availability:', error);
      setSelectionError('An error occurred while checking quiz data availability.');
    }
  };

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

      {!showPlayerSetup ? (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>1</div>
              <Typography variant="h3" className={styles.sectionTitle}>
                Select a Mode
              </Typography>
            </div>
            <div className={styles.sectionContent}>
              <section className={styles.modeSelector}>
                <Button
                  variant="primary"
                  className={selectedMode === 'Solo' ? styles.selected : ''}
                  onClick={() => handleModeSelect('Solo')}
                >
                  <Icon name="person" /> Solo Mode
                </Button>
                <Button
                  variant="primary"
                  className={selectedMode === 'Group' ? styles.selected : ''}
                  onClick={() => handleModeSelect('Group')}
                >
                  <Icon name="group" /> Group Mode
                </Button>
              </section>
              <div className={styles.minimalQuestionCount}>
                <Typography variant="body1">Questions:</Typography>
                <div className={styles.questionCountOptionsMinimal}>
                  {[10, 15, 20].map((count) => (
                    <Button
                      key={count}
                      variant={selectedQuestionCount === count ? 'primary' : 'secondary'}
                      onClick={() => handlePredefinedQuestionSelect(count)}
                      className={styles.questionCountButtonMinimal}
                      aria-pressed={selectedQuestionCount === count}
                    >
                      {count}
                    </Button>
                  ))}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={selectedQuestionCount === 'custom' ? numberOfQuestions : ''}
                    onChange={handleNumberOfQuestionsChange}
                    onBlur={handleInputBlur}
                    className={`${styles.questionCountInputMinimal} ${selectedQuestionCount === 'custom' ? styles.selected : ''} ${inputConfirmed ? styles.confirmed : ''}`}
                    aria-label="Custom number of questions"
                    placeholder="eg. 7"
                    onFocus={() => setSelectedQuestionCount('custom')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>2</div>
              <Typography variant="h3" className={styles.sectionTitle}>
                Select a Category
              </Typography>
            </div>
            <div className={styles.sectionContent}>
              {loadingCategories ? (
                <Typography variant="body1">Loading categories...</Typography>
              ) : categoryError ? (
                <Typography variant="body2" color="error">
                  {categoryError}
                </Typography>
              ) : categories.length === 0 ? (
                <Typography variant="body1">No categories available</Typography>
              ) : (
                <section className={styles.categoryGrid}>
                  {categories.map((category) => {
                    const requiresAuth = category.id > 3;
                    return (
                      <Card
                        key={category.id}
                        variant={selectedCategory?.id === category.id ? 'outlined' : 'default'}
                        className={`${styles.categoryCard} ${!isAuthenticated && requiresAuth ? styles.locked : ''}`}
                        onClick={() =>
                          (!requiresAuth || isAuthenticated) && handleCategorySelect(category)
                        }
                        aria-selected={selectedCategory?.id === category.id}
                        interactive={!requiresAuth || isAuthenticated}
                      >
                        <Typography variant="body1">{category.name}</Typography>
                        {!isAuthenticated && requiresAuth && (
                          <span className={styles.featureHint}>Sign in to unlock</span>
                        )}
                      </Card>
                    );
                  })}
                </section>
              )}
              <Button
                variant={isMixUpMode ? 'primary' : 'secondary'}
                onClick={handleMixUp}
                className={`${styles.mixUpButton} ${isMixUpMode ? styles.selected : ''}`}
              >
                <Icon name="shuffle" /> Mix Up
              </Button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>3</div>
              <Typography variant="h3" className={styles.sectionTitle}>
                Select a Level
              </Typography>
            </div>
            <div className={styles.sectionContent}>
              <section className={styles.difficultySelector}>
                {['Easy', 'Medium', 'Quiz Genius'].map((name) => (
                  <Button
                    key={name}
                    // variant="primary"
                    className={`${selectedDifficulty === name ? styles.selected : ''} ${styles[name.replace(' ', '').toLowerCase()]}`}
                    onClick={() => setSelectedDifficulty(name)}
                  >
                    {name}
                  </Button>
                ))}
              </section>
            </div>
          </div>

          {(selectionError || noDataError) && (
            <Typography variant="body2" className={styles.error}>
              {selectionError ||
                'No quiz data available for the selected category and difficulty.'}{' '}
            </Typography>
          )}

          <div className={styles.startQuiz}>
            <Button variant="primary" onClick={handleContinue}>
              Start Quiz
            </Button>
          </div>
        </>
      ) : (
        <PlayerManagement
          onPlayersConfirmed={(players) => {
            dispatch(
              setQuizSettings({
                mode: selectedMode,
                category: selectedCategory?.name || 'Mixed',
                categoryId: selectedCategory?.id,
                difficulty: selectedDifficulty,
                numberOfQuestions: parseInt(numberOfQuestions, 10) || 10,
                isMixedMode: isMixUpMode,
                groupState: {
                  players,
                  currentPlayerIndex: 0,
                  roundNumber: 1,
                },
              })
            );
            dispatch(
              startGroupQuiz({
                players: players.map((player) => player.name),
                categoryId: selectedCategory?.id,
                difficulty: selectedDifficulty,
                numberOfQuestions: parseInt(numberOfQuestions, 10) || 0,
              })
            );
            navigate('/quiz');
          }}
        />
      )}
    </div>
  );
};

export default Home;
