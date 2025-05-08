import React from 'react';
import { render } from '../../../utils/test-utils';
import { Grid } from './index';

describe('Grid Component', () => {
  it('renders with default props', () => {
    const { container } = render(<Grid>Grid Content</Grid>);
    expect(container.firstChild).toHaveClass('grid');
    expect(container.firstChild).toHaveClass('columns12');
    expect(container.firstChild).toHaveClass('gapmedium');
  });

  it('applies custom column and gap classes', () => {
    const { container } = render(
      <Grid columns={6} gap="large">
        Grid Content
      </Grid>
    );
    expect(container.firstChild).toHaveClass('columns6');
    expect(container.firstChild).toHaveClass('gaplarge');
  });
});
