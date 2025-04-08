import React from 'react';
import styles from './Icon.module.css';
import { IconProps } from './types';
import { icons } from './iconMap'; // Adjust the import path as necessary

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'medium',
  color = 'inherit',
  className,
  ...props
}) => {
  const SvgIcon = icons[name];
  if (!SvgIcon) return null;

  const iconClassName = `${styles.icon} ${styles[size]} ${styles[color]} ${className || ''}`.trim();

  // Remove onCopy to avoid type conflicts and cast props for the span element
  const { onCopy, ...filteredProps } = props;

  return (
    <span className={iconClassName} {...(filteredProps as React.HTMLAttributes<HTMLSpanElement>)}>
      <span>
        <div>
          <SvgIcon />
        </div>
      </span>
    </span>
  );
};

export default Icon;
