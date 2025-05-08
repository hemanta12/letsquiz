import React from 'react';
import styles from './Grid.module.css';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: number;
  gap?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({
  columns = 12,
  gap = 'medium',
  children,
  className,
  ...props
}) => {
  const gridClassName = `${styles.grid} ${styles[`columns${columns}`]} ${styles[`gap${gap}`]} ${
    className || ''
  }`.trim();

  return (
    <div className={gridClassName} {...props}>
      {children}
    </div>
  );
};

export default Grid;
