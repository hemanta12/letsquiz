import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../utils/test-utils';
import { PasswordReset } from './index';
import authService from '../../../services/authService';

jest.mock('../../../services/authService');

describe('PasswordReset Component', () => {
  it('handles successful password reset request', async () => {
    const mockResetPassword = authService.resetPassword as jest.Mock;
    mockResetPassword.mockResolvedValueOnce({});

    render(<PasswordReset />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/instructions sent/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@test.com');
    });
  });

  it('displays error message on reset failure', async () => {
    const mockResetPassword = authService.resetPassword as jest.Mock;
    mockResetPassword.mockRejectedValueOnce(new Error('Email not found'));

    render(<PasswordReset />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument();
    });
  });
});
