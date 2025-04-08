import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import Typography from './index';

describe('Typography Component', () => {
  it('renders text content correctly', () => {
    render(<Typography>Hello World</Typography>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies correct html tag based on variant', () => {
    const { container, rerender } = render(<Typography variant="h1">Heading</Typography>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    rerender(<Typography variant="body1">Paragraph</Typography>);
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
  });

  it('allows custom component override', () => {
    const { container } = render(
      <Typography variant="h1" component="span">
        Custom
      </Typography>
    );
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Typography className="custom-class">Text</Typography>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
