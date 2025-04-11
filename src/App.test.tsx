import { render, screen } from './utils/test-utils';
import App from './App';
import React from 'react';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />, {
      initialEntries: ['/'],
    });
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders 404 for invalid routes', async () => {
    render(<App />, {
      initialEntries: ['/invalid-route'],
    });

    // Wait for the NotFound component to render
    const headingElement = await screen.findByRole('heading', {
      level: 1,
      name: /404/i,
    });

    expect(headingElement).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });
});
