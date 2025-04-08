import React from 'react';
import styles from './Typography.module.css';
import { TypographyProps } from './types';

const variantMapping = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body1: 'p',
  body2: 'p',
  caption: 'span',
};

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  component,
  className,
  children,
  ...props
}) => {
  const Component = component || variantMapping[variant] || 'span';
  const typographyClassName = `${styles.typography} ${styles[variant]} ${className || ''}`.trim();

  return (
    <Component className={typographyClassName} {...props}>
      {children}
    </Component>
  );
};

export default Typography;
