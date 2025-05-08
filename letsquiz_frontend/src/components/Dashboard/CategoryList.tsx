import React from 'react';
import { Typography, Icon } from '../common';
import { IconName } from '../common/Icon/types';
import { CategoryStats, QuizSessionHistory } from '../../types/api.types';
import QuizCard from './QuizCard';
import styles from './CategoryList.module.css';

type CategoryListProps = {
  categoryStats: CategoryStats[];
  sessions: QuizSessionHistory[];
  expandedCategories: Set<string>;
  onCategoryToggle: (category: string) => void;
  onQuizCardClick: (session: QuizSessionHistory) => void;
};

const categoryIconMap: { [key: string]: IconName } = {
  History: 'menu',
  Science: 'check',
  Geography: 'arrowRight',
  Literature: 'play',
  'General Knowledge': 'person',
  Entertainment: 'group',
  Sports: 'shuffle',
  Movies: 'play',
  Trivia: 'check',
};

const CategoryList: React.FC<CategoryListProps> = ({
  categoryStats,
  sessions,
  expandedCategories,
  onCategoryToggle,
  onQuizCardClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCategoryToggle(category);
    }
  };

  return (
    <div className={styles.categoryTimeline}>
      {categoryStats.map((category) => {
        const categoryName = category.category;
        const iconName = categoryIconMap[categoryName] || 'shuffle';

        return (
          <div
            key={categoryName}
            className={`${styles.categoryGroup} ${styles[categoryName.toLowerCase().replace(/\s+/g, '-')]} `}
          >
            <div
              className={styles.categoryTitle}
              onClick={() => onCategoryToggle(categoryName)}
              onKeyDown={(e) => handleKeyDown(e, categoryName)}
              tabIndex={0}
              role="button"
              aria-expanded={expandedCategories.has(categoryName)}
            >
              <div className={styles.categoryContent}>
                <div className={styles.categoryIcon}>
                  <Icon name={iconName} size="large" />
                </div>
                <div>
                  <Typography variant="h3">{categoryName}</Typography>
                  <Typography variant="body2">
                    {category.totalQuizzes} quizzes | Avg:
                    {category.totalQuizzes > 0
                      ? Math.round(
                          ((category.totalScore !== null ? category.totalScore : 0) /
                            (category.totalQuizzes * 10)) *
                            100
                        )
                      : 0}
                    %
                  </Typography>
                </div>
              </div>
              <div
                className={`${styles.expandIcon} ${
                  expandedCategories.has(categoryName) ? styles.expanded : ''
                }`}
                aria-hidden="true"
              >
                ▼
              </div>
            </div>

            <div
              className={`${styles.categoryContent} ${
                expandedCategories.has(categoryName) ? styles.expanded : styles.collapsed
              }`}
            >
              {sessions
                .filter(
                  (session) => session.category === categoryName && session.completed_at !== null
                ) // Filter out incomplete sessions
                .sort(
                  (a, b) =>
                    new Date(b.completed_at as string).getTime() -
                    new Date(a.completed_at as string).getTime()
                )
                .map((session: QuizSessionHistory) => (
                  <QuizCard
                    key={session.id}
                    session={session}
                    onClick={() => onQuizCardClick(session)}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryList;
