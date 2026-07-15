import { useState } from 'react';

export default function PreviewModal({ initialContent, sourceLabel, onConfirm, onCancel }) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>Revisar antes de enviar</h2>
          <span className="modal-source">{sourceLabel}</span>
        </div>
        <textarea
          className="modal-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={12}
          autoFocus
        />
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={() => content.trim() && onConfirm(content.trim())}
            disabled={!content.trim()}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
