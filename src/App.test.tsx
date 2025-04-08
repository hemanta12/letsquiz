import { render, screen } from './utils/test-utils';
import App from './App';
import React from 'react';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders 404 for invalid routes', () => {
    window.history.pushState({}, '', '/invalid-route');
    render(<App />);
    expect(screen.getByText('404 - Not Found')).toBeInTheDocument();
  });
});
