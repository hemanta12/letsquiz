import React from 'react';
import { Button } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';

export interface DifficultySelectorProps {
  value: string;
  onSelect: (level: string) => void;
}

const levels = ['Easy', 'Medium', 'Quiz Genius'];

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ value, onSelect }) => (
  <div role="group" aria-label="Select difficulty" className={styles.difficultySelector}>
    {levels.map((lvl) => (
      <Button
        key={lvl}
        variant={value === lvl ? 'primary' : 'secondary'}
        className={`${value === lvl ? styles.selected : ''} ${styles[lvl.replace(' ', '').toLowerCase()]}`}
        onClick={() => onSelect(lvl)}
        aria-pressed={value === lvl}
      >
        {lvl}
      </Button>
    ))}
  </div>
);

export default DifficultySelector;
