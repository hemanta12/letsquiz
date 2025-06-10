import React from 'react';
import { Card, Icon, Button } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';
import historyImg from '../../assets/images/history.webp';
import geographyImg from '../../assets/images/geography.webp';
import scienceImg from '../../assets/images/science.webp';
import sportsImg from '../../assets/images/sports.webp';
import moviesImg from '../../assets/images/movies.webp';
import triviaImg from '../../assets/images/trivia.webp';

export interface Category {
  id: number;
  name: string;
}

// Categories with IDs matching the database records
export const QUIZ_CATEGORIES: Category[] = [
  { id: 1, name: 'Science' },
  { id: 2, name: 'History' },
  { id: 3, name: 'Geography' },
  { id: 4, name: 'Sports' },
  { id: 5, name: 'Movies' },
  { id: 6, name: 'Trivia' },
];

export interface CategorySelectorProps {
  selectedCategoryId: number | null;
  isMixUp: boolean;
  onSelect: (cat: Category) => void;
  onMixToggle: () => void;
  isAuthenticated: boolean;
}

const categoryImages: Record<string, string> = {
  Geography: geographyImg,
  History: historyImg,
  Movies: moviesImg,
  Science: scienceImg,
  Sports: sportsImg,
  Trivia: triviaImg,
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  isMixUp,
  onSelect,
  onMixToggle,
}) => (
  <div>
    <div role="group" aria-label="Select category" className={styles.categoryGrid}>
      {QUIZ_CATEGORIES.map((cat) => {
        const isSelected = selectedCategoryId === cat.id && !isMixUp;
        const bgUrl = categoryImages[cat.name];
        const style = bgUrl
          ? {
              backgroundImage: `
           linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,.65) 75%),
           url(${bgUrl})
         `,
            }
          : {};
        return (
          <Card
            key={cat.id}
            style={style}
            variant={isSelected ? 'outlined' : 'default'}
            className={`
              ${styles.categoryCard}
              ${isSelected ? styles.selected : ''}
            `}
            onClick={() => onSelect(cat)}
            aria-selected={isSelected}
          >
            <span className={styles.categoryTitle}>{cat.name}</span>
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
