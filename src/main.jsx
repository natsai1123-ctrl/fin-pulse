import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // 💡 校正點：確保讀取的是昨天完工的 App.jsx
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
