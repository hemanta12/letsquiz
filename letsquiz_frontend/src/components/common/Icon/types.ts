export type IconName =
  | 'group'
  | 'person'
  | 'shuffle'
  | 'edit'
  | 'delete'
  | 'expandMore'
  | 'home'
  | 'settings'
  | 'login'
  | 'logout'
  | 'add'
  | 'remove'
  | 'check'
  | 'close'
  | 'menu'
  | 'search'
  | 'book'
  | 'timer'
  | 'award'
  | 'help'
  | 'alert'
  | 'chart'
  | 'list'
  | 'question'
  | 'trophy'
  | 'play'
  | 'arrowRight'
  | 'correct'
  | 'wrong'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'leaderboard'
  | 'quiz'
  | 'countdown';

export interface IconProps {
  name: IconName;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}
