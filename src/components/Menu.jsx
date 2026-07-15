import { useEffect, useRef } from 'react';

export default function Menu({ onSettingsClick, onChangeProfile, onOpenDiagnostics, onExport, onTheme, onContextLibrary, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="menu-dropdown" ref={ref}>
      <button className="menu-item" onClick={onChangeProfile}>Trocar profile</button>
      <button className="menu-item" onClick={onContextLibrary}>Biblioteca de contextos</button>
      <button className="menu-item" onClick={onExport}>Exportar conversa</button>
      <button className="menu-item" onClick={onTheme}>Aparência</button>
      <button className="menu-item" onClick={onSettingsClick}>Configurações</button>
      {onOpenDiagnostics && (
        <button className="menu-item" onClick={onOpenDiagnostics}>Diagnóstico de gateway</button>
      )}
    </div>
  );
}
