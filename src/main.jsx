import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { settingsService } from './services/profileService.js'
import { applyThemeSettings } from './components/ThemeSettings.jsx'

// Apply persisted theme/font settings before first render
settingsService.get('fontSize', '16px').then(fs =>
  settingsService.get('theme', 'light').then(th => applyThemeSettings(fs, th))
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
