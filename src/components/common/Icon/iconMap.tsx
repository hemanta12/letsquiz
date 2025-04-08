import React from 'react';
import { IconName } from './types';

export const icons: Record<IconName, React.FC<React.SVGProps<SVGSVGElement>>> = {
  play: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  close: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
  group: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  check: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9 16.2l-3.5-3.5L4 14l5 5 10-10-1.5-1.5z" />
    </svg>
  ),
  'arrow-right': (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M10 17l5-5-5-5v10z" />
    </svg>
  ),
  person: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" />
    </svg>
  ),
  shuffle: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4 4h2l6 6-6 6H4v-2l4-4-4-4V4zm16 0v2l-4 4 4 4v2h-2l-6-6 6-6h2z" />
    </svg>
  ),
};
