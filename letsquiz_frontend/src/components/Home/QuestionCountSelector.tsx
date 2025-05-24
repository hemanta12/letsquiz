import React from 'react';
import { Button, Input, Typography } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';

export interface QuestionCountSelectorProps {
  selectedCount: number | 'custom';
  numberInput: string;
  inputConfirmed: boolean;
  onSelectPreset: (count: number) => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
}

const presets = [10, 15, 20];

const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
  selectedCount,
  numberInput,
  inputConfirmed,
  onSelectPreset,
  onInputChange,
  onInputBlur,
}) => (
  <div className={styles.minimalQuestionCount} role="group" aria-label="Select number of questions">
    <Typography variant="body1">Questions:</Typography>
    <div className={styles.questionCountOptionsMinimal}>
      {presets.map((n) => (
        <Button
          key={n}
          variant={selectedCount === n ? 'primary' : 'secondary'}
          onClick={() => onSelectPreset(n)}
          className={styles.questionCountButtonMinimal}
          aria-pressed={selectedCount === n}
        >
          {n}
        </Button>
      ))}
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="eg. 7"
        value={selectedCount === 'custom' ? numberInput : ''}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={onInputBlur}
        className={`
          ${styles.questionCountInputMinimal}
          ${selectedCount === 'custom' ? styles.selected : ''}
          ${inputConfirmed ? styles.confirmed : ''}
        `}
        aria-label="Custom number of questions"
        onFocus={() => selectedCount !== 'custom' && onSelectPreset('custom' as any)} // switch to custom
      />
    </div>
  </div>
);

export default QuestionCountSelector;
