import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import styles from './SessionWarningModal.module.css';

interface SessionWarningModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onLogout: () => void;
  timeRemaining: number;
}

const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  onContinue,
  onLogout,
  timeRemaining: initialTime,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  // Always reset timer when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(initialTime);
    }
  }, [isOpen, initialTime]);

  useEffect(() => {
    if (!isOpen || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeRemaining, onLogout]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={undefined}
      title="Session Expiring Soon"
      className={styles.sessionWarningModal}
    >
      <div className={styles.content}>
        <p className={styles.message}>
          Your session will expire due to inactivity in{' '}
          <span className={styles.timer}>{formatTime(timeRemaining)}</span>
        </p>
        <p className={styles.subMessage}>
          Click "Continue Session" to stay logged in, or you'll be automatically logged out.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onLogout} className={styles.logoutButton}>
            Logout Now
          </Button>
          <Button
            variant="primary"
            onClick={onContinue}
            className={styles.continueButton}
            autoFocus
          >
            Continue Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionWarningModal;
