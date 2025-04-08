import React from 'react';
import { render } from '../../../utils/test-utils';
import Loading from './index';

describe('Loading Component', () => {
  it('renders spinner variant by default', () => {
    const { container } = render(<Loading />);
    expect(container.firstChild).toHaveClass('spinner');
  });

  it('renders skeleton variant', () => {
    const { container } = render(<Loading variant="skeleton" />);
    expect(container.firstChild).toHaveClass('skeleton');
  });

  it('applies size classes correctly', () => {
    const { rerender, container } = render(<Loading size="small" />);
    expect(container.firstChild).toHaveClass('small');

    rerender(<Loading size="large" />);
    expect(container.firstChild).toHaveClass('large');
  });

  it('applies color classes correctly', () => {
    const { rerender, container } = render(<Loading color="primary" />);
    expect(container.firstChild).toHaveClass('primary');

    rerender(<Loading color="secondary" />);
    expect(container.firstChild).toHaveClass('secondary');
  });
});
