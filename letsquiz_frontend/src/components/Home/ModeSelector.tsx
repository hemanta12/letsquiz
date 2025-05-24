import React from 'react';
import { Button, Icon } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';

export interface ModeSelectorProps {
  value: 'Solo' | 'Group';
  onChange: (mode: 'Solo' | 'Group') => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange }) => (
  <div role="group" aria-label="Select mode" className={styles.modeSelector}>
    <Button
      variant="primary"
      className={value === 'Solo' ? styles.selected : ''}
      onClick={() => onChange('Solo')}
      aria-pressed={value === 'Solo'}
    >
      <Icon name="person" /> Solo Mode
    </Button>
    <Button
      variant="primary"
      className={value === 'Group' ? styles.selected : ''}
      onClick={() => onChange('Group')}
      aria-pressed={value === 'Group'}
    >
      <Icon name="group" /> Group Mode
    </Button>
  </div>
);

export default ModeSelector;
