import React, { useEffect } from 'react';
import { Card, Icon, Button } from '../../components/common';
import styles from '../../pages/Home/Home.module.css';
import historyImg from '../../assets/images/history.webp';
import geographyImg from '../../assets/images/geography.webp';
import scienceImg from '../../assets/images/science.webp';
import { LEVEL1_CATEGORIES } from '../../constants/level1';

export interface Category {
  id: number;
  name: string;
}

export const QUIZ_CATEGORIES: Category[] = LEVEL1_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
}));

export interface CategorySelectorProps {
  selectedCategoryId: number | null;
  isMixUp: boolean;
  onSelect: (cat: Category) => void;
  onMixToggle: () => void;
}

const categoryImages: Record<string, string> = {
  Geography: geographyImg,
  History: historyImg,
  Science: scienceImg,
};

let hasPreloadedCategoryImages = false;

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  isMixUp,
  onSelect,
  onMixToggle,
}) => {
  useEffect(() => {
    if (hasPreloadedCategoryImages) return;

    Object.values(categoryImages).forEach((src) => {
      const image = new Image();
      image.src = src;
    });

    hasPreloadedCategoryImages = true;
  }, []);

  return (
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
};

export default CategorySelector;
