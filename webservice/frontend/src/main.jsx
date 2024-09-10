import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './pages/Home.jsx'
import AudioAnalyze from './pages/AudioAnalyze.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AudioAnalyze />
  </StrictMode>,
)
