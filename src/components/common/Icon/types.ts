export type IconName =
  | 'play'
  | 'pause'
  | 'close'
  | 'check'
  | 'arrow-right'
  | 'person'
  | 'group'
  | 'shuffle';

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: IconName;
  size?: 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary';
}
