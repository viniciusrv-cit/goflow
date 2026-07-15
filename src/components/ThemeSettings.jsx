import { useState, useEffect } from 'react';
import { settingsService } from '../services/profileService';

const FONT_SIZES = [
  { label: 'Pequeno', value: '14px' },
  { label: 'Médio', value: '16px' },
  { label: 'Grande', value: '18px' },
  { label: 'Extra grande', value: '20px' },
];

const THEMES = [
  { label: 'Claro', value: 'light' },
  { label: 'Escuro', value: 'dark' },
];

export function applyThemeSettings(fontSize, theme) {
  document.documentElement.style.setProperty('--user-font-size', fontSize);
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeSettings({ onClose }) {
  const [fontSize, setFontSize] = useState('16px');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    Promise.all([
      settingsService.get('fontSize', '16px'),
      settingsService.get('theme', 'light'),
    ]).then(([fs, th]) => {
      setFontSize(fs);
      setTheme(th);
    });
  }, []);

  const save = async (newFontSize, newTheme) => {
    await settingsService.set('fontSize', newFontSize);
    await settingsService.set('theme', newTheme);
    applyThemeSettings(newFontSize, newTheme);
  };

  const handleFontSize = (v) => { setFontSize(v); save(v, theme); };
  const handleTheme = (v) => { setTheme(v); save(fontSize, v); };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Aparência</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="theme-section">
          <label className="theme-label">Tamanho da fonte</label>
          <div className="theme-options">
            {FONT_SIZES.map(f => (
              <button
                key={f.value}
                className={`theme-option ${fontSize === f.value ? 'active' : ''}`}
                onClick={() => handleFontSize(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="theme-section">
          <label className="theme-label">Tema</label>
          <div className="theme-options">
            {THEMES.map(t => (
              <button
                key={t.value}
                className={`theme-option ${theme === t.value ? 'active' : ''}`}
                onClick={() => handleTheme(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
