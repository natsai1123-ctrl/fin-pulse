import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './FinPulseAppContainer.jsx'; // 👈 完美鎖定全新防爆容器

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);