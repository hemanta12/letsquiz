export type IconName =
  | 'play'
  | 'pause'
  | 'close'
  | 'check'
  | 'arrowRight'
  | 'person'
  | 'group'
  | 'shuffle'
  | 'menu'
  | 'edit'
  | 'delete'
  | 'expandMore';

export interface IconProps {
  name: IconName;
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary';
  className?: string;
  style?: React.CSSProperties;
}
