import React from 'react';
import { motion } from 'framer-motion';
import styles from './RouteTransition.module.css';

interface RouteTransitionProps {
  children: React.ReactNode;
}

const pageTransition = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

export const RouteTransition: React.FC<RouteTransitionProps> = ({ children }) => {
  return (
    <motion.div
      className={styles.transition}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export default RouteTransition;
