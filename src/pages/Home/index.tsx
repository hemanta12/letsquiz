import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Icon } from '../../components/common';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { setQuizSettings } from '../../store/slices/quizSlice';
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
  const [validationMessage, setValidationMessage] = useState('');
  const [isMixUpMode, setIsMixUpMode] = useState(false);

  const handleMixUp = useCallback(() => {
    setSelectedCategory(isMixUpMode ? '' : 'all');
    setIsMixUpMode(!isMixUpMode);
  }, [isMixUpMode]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsMixUpMode(false);
  };

  const validateSelection = () => {
    if (!selectedCategory) {
      setValidationMessage('Please select a category or use Mix Up mode');
      return false;
    }
    if (!selectedDifficulty) {
      setValidationMessage('Please select a difficulty level');
      return false;
    }
    setValidationMessage('');
    return true;
  };

  const handleStartQuiz = () => {
    if (validateSelection()) {
      dispatch(
        setQuizSettings({
          mode: selectedMode,
          category: isMixUpMode ? 'all' : selectedCategory,
          difficulty: selectedDifficulty,
          isMixedMode: isMixUpMode,
        })
      );
      navigate('/quiz');
    }
  };

  return (
    <div className={styles.home}>
      <Typography variant="h2" className={styles.welcomeMessage}>
        Welcome to LetsQuiz
      </Typography>

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
              onClick={() => setSelectedMode('Solo')}
            >
              <Icon name="person" /> Solo Mode
            </Button>
            <Button
              variant="primary"
              className={selectedMode === 'Group' ? styles.selected : ''}
              onClick={() => setSelectedMode('Group')}
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

      {validationMessage && (
        <Typography variant="body2" color="error" className={styles.validationMessage}>
          {validationMessage}
        </Typography>
      )}

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

      <section className={styles.startQuiz}>
        <Button
          variant="primary"
          size="large"
          onClick={handleStartQuiz}
          disabled={!selectedCategory || !selectedDifficulty}
        >
          Start Quiz →
        </Button>
      </section>
    </div>
  );
};

export default Home;
