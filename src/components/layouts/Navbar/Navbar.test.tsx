import React from 'react';
import { render, screen, fireEvent } from '../../../utils/test-utils';
import { Navbar } from './index';

describe('Navbar Component', () => {
  it('renders logo and navigation links', () => {
    render(<Navbar />);
    expect(screen.getByText('LetsQuiz')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('toggles mobile menu when button is clicked', () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toHaveClass('isOpen');
  });
});
