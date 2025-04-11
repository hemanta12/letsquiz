import React from 'react';
import { Navbar } from '../Navbar';
import { Container } from '../Container';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Container>{children}</Container>
      </main>
    </div>
  );
};

export default MainLayout;
