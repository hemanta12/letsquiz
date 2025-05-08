import React from 'react';
import { render, screen } from '@testing-library/react';
import ChangePassword from './index';

describe('ChangePassword', () => {
  test('renders the component', () => {
    render(<ChangePassword />);
    const linkElement = screen.getByText(/Change Password/i);
    expect(linkElement).toBeInTheDocument();
  });
});
