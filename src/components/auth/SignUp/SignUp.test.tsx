import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../utils/test-utils';
import { SignUp } from './index';
import authService from '../../../services/authService';

jest.mock('../../../services/authService');

describe('SignUp Component', () => {
  it('validates password match', async () => {
    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('handles successful registration', async () => {
    const mockSignup = authService.signup as jest.Mock;
    mockSignup.mockResolvedValueOnce({});

    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
        confirmPassword: 'password123',
      });
    });
  });
});
