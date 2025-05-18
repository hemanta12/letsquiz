import React from 'react';
import styles from './CircularProgressBar.module.css';

interface CircularProgressBarProps {
  score: number;
  totalQuestions: number;
  percentage: number;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  score,
  totalQuestions,
  percentage,
}) => {
  const radius = 100;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={styles.container}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-label={`Quiz performance: ${percentage}% correct`}
    >
      <svg width={radius * 2} height={radius * 2} aria-hidden="true">
        <circle
          stroke="var(--color-primary)"
          strokeOpacity="0.2"
          fill="none"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <circle
          stroke="var(--color-primary)"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="currentColor"
          fontSize="1.5rem"
          fontWeight="bold"
        >
          {score}/{totalQuestions}
        </text>
      </svg>
      <div className={styles.percentage}>{percentage}%</div>
    </div>
  );
};

export default CircularProgressBar;
