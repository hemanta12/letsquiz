import React from 'react';
import { SvgIcon } from '@mui/material';
import { icons } from './iconMap';
import { IconProps } from './types';
import styles from './Icon.module.css';

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'medium',
  color = 'inherit',
  className,
  ...props
}) => {
  const IconComponent = icons[name];
  if (!IconComponent) return null;

  const iconClassName = `${styles.icon} ${styles[size]} ${styles[color]} ${className || ''}`.trim();

  return (
    <span className={iconClassName}>
      <SvgIcon
        component={IconComponent}
        fontSize={size}
        color={color === 'inherit' ? 'inherit' : color}
      />
    </span>
  );
};

export default Icon;
