import React from 'react';
import { Card, Icon, Button, Typography } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';

export interface Category {
  id: number;
  name: string;
}

export interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: number | null;
  isMixUp: boolean;
  onSelect: (cat: Category) => void;
  onMixToggle: () => void;
  isAuthenticated: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  isMixUp,
  onSelect,
  onMixToggle,
  isAuthenticated,
}) => (
  <div>
    <div role="group" aria-label="Select category" className={styles.categoryGrid}>
      {categories.map((cat) => {
        const requiresAuth = cat.id > 3;
        const isSelected = selectedCategoryId === cat.id;
        return (
          <Card
            key={cat.id}
            variant={isSelected ? 'outlined' : 'default'}
            className={`
              ${styles.categoryCard}
              ${!isAuthenticated && requiresAuth ? styles.locked : ''}
              ${isSelected ? styles.selected : ''}
            `}
            onClick={() => (!requiresAuth || isAuthenticated) && onSelect(cat)}
            aria-selected={isSelected}
            interactive={!requiresAuth || isAuthenticated}
          >
            <Typography variant="body1">{cat.name}</Typography>
            {!isAuthenticated && requiresAuth && (
              <span className={styles.featureHint}>Sign in to unlock</span>
            )}
          </Card>
        );
      })}
    </div>
    <Button
      variant={isMixUp ? 'primary' : 'secondary'}
      onClick={onMixToggle}
      className={`
        ${styles.mixUpButton}
        ${isMixUp ? styles.selected : ''}
      `}
      aria-pressed={isMixUp}
    >
      <Icon name="shuffle" /> Mix Up
    </Button>
  </div>
);

export default CategorySelector;
