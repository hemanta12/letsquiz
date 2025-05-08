import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import Card from './index';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Card variant="default">Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('default');

    rerender(<Card variant="outlined">Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('outlined');

    rerender(<Card variant="elevated">Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('elevated');
  });

  it('shows loading state', () => {
    const { container } = render(<Card loading>Content</Card>);
    expect(container.firstChild).toHaveClass('loading');
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('applies interactive styles when interactive prop is true', () => {
    render(<Card interactive>Card</Card>);
    expect(screen.getByText('Card')).toHaveClass('interactive');
  });
});
