import React from 'react';
import { Button, Typography } from '../common';
import styles from '../../pages/Home/Home.module.css';

export interface QuestionCountSelectorProps {
  selectedCount: number;
  onSelectPreset: (count: number) => void;
}

const presets = [2, 5, 10, 20, 30];

const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
  selectedCount,
  onSelectPreset,
}) => (
  <div className={styles.minimalQuestionCount} role="group" aria-label="Select number of questions">
    <Typography variant="body1">
      <span>Questions:</span>
    </Typography>
    <div className={styles.questionCountOptionsMinimal}>
      {presets.map((n) => (
        <Button
          key={n}
          variant={selectedCount === n ? 'primary' : 'secondary'}
          onClick={() => onSelectPreset(n)}
          className={`${styles.questionCountButtonMinimal} ${selectedCount === n ? styles.selected : ''}`}
          aria-pressed={selectedCount === n}
        >
          {n}
        </Button>
      ))}
    </div>
  </div>
);

export default QuestionCountSelector;
