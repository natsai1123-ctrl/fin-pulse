import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './FinPulseDashboard.jsx'; // 👈 精準讀取全新元件

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
