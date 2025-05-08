import React from 'react';
import { render, screen, fireEvent } from '../../../utils/test-utils';
import Modal from './index';

describe('Modal Component', () => {
  it('renders when open is true', () => {
    render(
      <Modal open={true} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <Modal open={false} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when escape key is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose}>
        Modal Content
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking overlay', () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose}>
        Modal Content
      </Modal>
    );
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
  });
});
