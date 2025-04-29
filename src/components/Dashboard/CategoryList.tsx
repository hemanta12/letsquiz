import React from 'react';
import { Typography } from '../common';
import { CategoryStats, QuizSession } from '../../types/dashboard.types';
import QuizCard from './QuizCard';
import styles from './CategoryList.module.css';

type CategoryListProps = {
  categoryStats: CategoryStats[];
  sessions: QuizSession[];
  expandedCategories: Set<string>;
  expandedSession: number | null;
  onCategoryToggle: (category: string) => void;
  onSessionExpand: (sessionId: number) => void;
  categoryIcons: Record<string, string>;
};

const CategoryList: React.FC<CategoryListProps> = ({
  categoryStats,
  sessions,
  expandedCategories,
  expandedSession,
  onCategoryToggle,
  onSessionExpand,
  categoryIcons,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, category: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCategoryToggle(category);
    }
  };

  return (
    <div className={styles.categoryTimeline}>
      {categoryStats.map((category) => (
        <div key={category.category} className={styles.categoryGroup}>
          <div
            className={styles.categoryTitle}
            onClick={() => onCategoryToggle(category.category)}
            onKeyDown={(e) => handleKeyDown(e, category.category)}
            tabIndex={0}
            role="button"
            aria-expanded={expandedCategories.has(category.category)}
          >
            <div className={styles.categoryContent}>
              <div className={styles.categoryIcon}>{categoryIcons[category.category] || '📝'}</div>
              <div>
                <Typography variant="h3">{category.category}</Typography>
                <Typography variant="body2">
                  {category.totalQuizzes} quizzes | Avg:
                  {Math.round((category.totalScore / (category.totalQuizzes * 10)) * 100)}%
                </Typography>
              </div>
            </div>
            <div
              className={`${styles.expandIcon} ${
                expandedCategories.has(category.category) ? styles.expanded : ''
              }`}
              aria-hidden="true"
            >
              ▼
            </div>
          </div>

          <div
            className={`${styles.categoryContent} ${
              expandedCategories.has(category.category) ? styles.expanded : styles.collapsed
            }`}
          >
            {sessions
              .filter((session) => session.category === category.category)
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .map((session) => (
                <QuizCard
                  key={session.id}
                  session={session}
                  isExpanded={expandedSession === session.id}
                  onToggle={() => onSessionExpand(session.id)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
