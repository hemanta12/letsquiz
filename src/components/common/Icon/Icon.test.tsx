import React from 'react';
import { render, screen } from '../../../utils/test-utils';
import Icon from './index';

describe('Icon Component', () => {
  it('renders icon by name', () => {
    const { container } = render(<Icon name="play" />);
    expect(container.firstChild).toHaveClass('icon');
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<Icon name="play" size="small" />);
    expect(container.firstChild).toHaveClass('small');

    rerender(<Icon name="play" size="large" />);
    expect(container.firstChild).toHaveClass('large');
  });

  it('applies color classes correctly', () => {
    const { container, rerender } = render(<Icon name="play" color="primary" />);
    expect(container.firstChild).toHaveClass('primary');

    rerender(<Icon name="play" color="secondary" />);
    expect(container.firstChild).toHaveClass('secondary');
  });
});
