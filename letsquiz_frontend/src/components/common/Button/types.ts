export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'quit';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  className?: string;
}
