import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // توکن‌ها و پایه
import './ui.css'      // لایهٔ کامپوننت‌ها (ترتیب مهم است: ui از توکن‌ها می‌خواند)
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
