import React from 'react';

const p1 = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
const p2 = "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z";

export default function Icon({ name, size = 18 }) {
  const icons = {
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    sun: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={p1} />,
    moon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={p2} />
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      {icons[name] || null}
    </svg>
  );
}
