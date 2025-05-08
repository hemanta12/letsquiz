export type IconName =
  | 'play'
  | 'pause'
  | 'close'
  | 'check'
  | 'arrowRight'
  | 'person'
  | 'group'
  | 'shuffle'
  | 'menu';

export interface IconProps {
  name: IconName;
  size?: 'small' | 'medium' | 'large'; // Add back size prop
  color?: 'inherit' | 'primary' | 'secondary'; // Add back color prop
  className?: string;
}
