import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx'; // 👈 確保這裡路徑完全正確

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
