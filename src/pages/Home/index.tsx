import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Icon } from '../../components/common';
import { PlayerManagement } from '../../components/GroupMode/PlayerManagement/index';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { setQuizSettings, fetchQuizQuestions } from '../../store/slices/quizSlice';
import styles from './Home.module.css';

const categories = ['History', 'Science', 'Geography', 'Movies', 'Sports', 'Trivia'];

const difficulties = [
  { name: 'Easy', color: 'var(--color-easy)' },
  { name: 'Medium', color: 'var(--color-medium)' },
  { name: 'Quiz Genius', color: 'var(--color-quiz-genius)' },
];

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [selectedMode, setSelectedMode] = useState<'Solo' | 'Group'>('Solo');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isMixUpMode, setIsMixUpMode] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [selectionError, setSelectionError] = useState('');

  const handleMixUp = useCallback(() => {
    setSelectedCategory(isMixUpMode ? '' : 'all');
    setIsMixUpMode(!isMixUpMode);
  }, [isMixUpMode]);

  const handleCategorySelect = (category: string) => {
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
    if (!selectedCategory) {
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
    if (!validateSelections()) return;

    dispatch(
      setQuizSettings({
        mode: selectedMode,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        isMixedMode: isMixUpMode,
      })
    );

    if (selectedMode === 'Group') {
      navigate('/player-setup');
    } else {
      // Fetch questions before navigating for Solo mode
      try {
        await dispatch(
          fetchQuizQuestions({ category: selectedCategory, difficulty: selectedDifficulty })
        );
        navigate('/quiz');
      } catch (error) {
        // Handle error fetching questions, maybe display an error message
        console.error('Error fetching quiz questions:', error);
        setSelectionError('Failed to load quiz questions. Please try again.');
      }
    }
  };

  return (
    <div className={styles.home}>
      <Typography variant="h2" className={styles.welcomeMessage}>
        Welcome to LetsQuiz
      </Typography>

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
              <section className={styles.categoryGrid}>
                {categories.map((category) => (
                  <Card
                    key={category}
                    variant={selectedCategory === category ? 'outlined' : 'default'}
                    className={styles.categoryCard}
                    onClick={() => handleCategorySelect(category)}
                    aria-selected={selectedCategory === category}
                  >
                    <Typography variant="body1">{category}</Typography>
                  </Card>
                ))}
              </section>
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

          {selectionError && (
            <Typography variant="body2" className={styles.error}>
              {selectionError}
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
                category: selectedCategory,
                difficulty: selectedDifficulty,
                isMixedMode: isMixUpMode,
                groupState: {
                  players,
                  currentPlayerIndex: 0,
                  roundNumber: 1,
                },
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
