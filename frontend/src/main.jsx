import 'bootstrap/dist/css/bootstrap.min.css'
import './react-management.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// FF01: React application entry point.
// createRoot connects React to the HTML root element.
// StrictMode helps identify development-time problems.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
