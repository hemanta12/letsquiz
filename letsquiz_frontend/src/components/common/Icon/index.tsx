import React, { ElementType } from 'react';
import { icons } from './iconMap';
import { IconProps } from './types';
import styles from './Icon.module.css';

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'medium',
  color = 'inherit',
  className,
  style,
  ...props
}) => {
  const IconComponent = icons[name] as ElementType;
  if (!IconComponent) return null;

  const sizeMap = {
    xs: '16px',
    small: '20px',
    medium: '24px',
    large: '32px',
  };

  const finalSize = sizeMap[size] || size;

  return (
    <span className={`${styles.icon} ${className || ''}`} style={style}>
      <IconComponent
        size={finalSize}
        color={color === 'inherit' ? 'currentColor' : color}
        {...props}
      />
    </span>
  );
};

export default Icon;
