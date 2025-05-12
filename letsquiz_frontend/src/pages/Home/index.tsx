import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Icon, Modal } from '../../components/common';
import { PlayerManagement } from '../../components/GroupMode/PlayerManagement/index';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { setQuizSettings, fetchQuizQuestions, startGroupQuiz } from '../../store/slices/quizSlice';
import QuizService from '../../services/quizService';
import AuthService from '../../services/authService';
import styles from './Home.module.css';

const difficulties = [
  { name: 'Easy', color: 'var(--color-easy)' },
  { name: 'Medium', color: 'var(--color-medium)' },
  { name: 'Quiz Genius', color: 'var(--color-quiz-genius)' },
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [selectedMode, setSelectedMode] = useState<'Solo' | 'Group'>('Solo');
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(
    null
  ); // Store selected category with ID
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isMixUpMode, setIsMixUpMode] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [noDataError, setNoDataError] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<{ id: number; name: string }[]>(
    []
  ); // Store fetched categories
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    const getCategories = async () => {
      try {
        const fetchedCategories = await QuizService.fetchCategories();
        setAvailableCategories(fetchedCategories);
      } catch (error: any) {
        setCategoryError('Failed to load categories. Please try again.');
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    getCategories();
  }, []); // Fetch categories on component mount

  const handleMixUp = useCallback(() => {
    setSelectedCategory(null);
    setIsMixUpMode(!isMixUpMode);
  }, [isMixUpMode]);

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
      // Allow no category if mix up is selected
      setSelectionError('Please select a category');
      return false;
    }
    if (!selectedDifficulty) {
      setSelectionError('Please select a difficulty level');
      return false;
    }
    setSelectionError('');
    return true;
  };

  const handleContinue = async () => {
    setNoDataError(false);
    setSelectionError('');
    if (!validateSelections()) return;

    // Create guest session if user is not authenticated
    if (!isAuthenticated) {
      try {
        AuthService.createGuestSession();
      } catch (error) {
        console.error('Error creating guest session:', error);
        setSelectionError('Failed to create guest session. Please try again.');
        return;
      }
    }

    const categoryId = isMixUpMode ? null : selectedCategory?.id;

    if (selectedMode === 'Group') {
      try {
        const isDataAvailable = await QuizService.checkQuizDataAvailability(
          categoryId, // Pass category ID
          selectedDifficulty
        );
        if (isDataAvailable) {
          dispatch(
            setQuizSettings({
              mode: selectedMode,
              category: selectedCategory?.name || 'Mixed', // Store category name or 'Mixed'
              categoryId: categoryId, // Pass category ID
              difficulty: selectedDifficulty,
              isMixedMode: isMixUpMode,
            })
          );
          navigate('/player-setup');
        } else {
          setNoDataError(true);
        }
      } catch (error) {
        console.error('Error checking quiz data availability:', error);
        setSelectionError('An error occurred while checking quiz data availability.');
      }
    } else {
      try {
        const isDataAvailable = await QuizService.checkQuizDataAvailability(
          categoryId, // Pass category ID
          selectedDifficulty
        );
        if (isDataAvailable) {
          dispatch(
            setQuizSettings({
              mode: selectedMode,
              category: selectedCategory?.name || 'Mixed', // Store category name or 'Mixed'
              categoryId: categoryId, // Pass category ID
              difficulty: selectedDifficulty,
              isMixedMode: isMixUpMode,
            })
          );
          await dispatch(
            fetchQuizQuestions({ category: categoryId, difficulty: selectedDifficulty }) // Pass category ID
          );
          navigate('/quiz');
        } else {
          setNoDataError(true);
        }
      } catch (error) {
        console.error('Error checking or fetching solo quiz data:', error);
        setSelectionError('An error occurred while setting up the solo quiz.');
      }
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
            You're playing as a guest. Sign in for free to: • Save your quiz history • Track your
            progress • Access all quiz modes
          </Typography>
          <div className={styles.guestActions}>
            <Button variant="primary" onClick={() => navigate('/signup')}>
              Sign Up
            </Button>
            <Button variant="secondary" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
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
                  {!isAuthenticated && (
                    <span className={styles.featureHint}>Limited to 10 questions</span>
                  )}
                </Button>
                <Button
                  variant="primary"
                  className={selectedMode === 'Group' ? styles.selected : ''}
                  onClick={() => handleModeSelect('Group')}
                  disabled={!isAuthenticated}
                >
                  <Icon name="group" /> Group Mode
                  {!isAuthenticated && (
                    <span className={styles.featureHint}>Sign in to unlock</span>
                  )}
                </Button>
              </section>
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
              ) : availableCategories.length === 0 ? (
                <Typography variant="body1">No categories available</Typography>
              ) : (
                <section className={styles.categoryGrid}>
                  {availableCategories.map((category) => {
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
                {difficulties.map(({ name, color }) => (
                  <Button
                    key={name}
                    variant="primary"
                    className={selectedDifficulty === name ? styles.selected : ''}
                    style={{ backgroundColor: color }}
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
                category: selectedCategory?.name || 'Mixed', // Store category name or 'Mixed'
                categoryId: selectedCategory?.id, // Pass category ID
                difficulty: selectedDifficulty,
                isMixedMode: isMixUpMode,
                groupState: {
                  players,
                  currentPlayerIndex: 0,
                  roundNumber: 1,
                },
              })
            );
            // Dispatch startGroupQuiz with categoryId
            dispatch(
              startGroupQuiz({
                players: players.map((player) => player.name), // Map Player objects to names
                categoryId: selectedCategory?.id, // Pass category ID
                difficulty: selectedDifficulty,
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
