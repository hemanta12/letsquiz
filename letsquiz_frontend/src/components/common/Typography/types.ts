export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'body1' | 'body2' | 'caption';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  component?: React.ElementType;
  className?: string;
}
