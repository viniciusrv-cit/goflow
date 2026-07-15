import { useState, useEffect } from 'react';
import { templateService } from '../services/profileService';

export default function TemplateManager({ onClose, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | template object
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => setTemplates(await templateService.getAll());

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    if (editing === 'new') {
      await templateService.create(name.trim(), content.trim());
    } else {
      await templateService.update(editing.id, { name: name.trim(), content: content.trim() });
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar este template?')) return;
    await templateService.delete(id);
    load();
  };

  const openNew = () => { setEditing('new'); setName(''); setContent(''); };
  const openEdit = (tpl) => { setEditing(tpl); setName(tpl.name); setContent(tpl.content); };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-large">
        <div className="modal-header">
          <h2>Templates</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {editing ? (
          <div className="template-form">
            <input
              className="template-name-input"
              placeholder="Nome do template"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <textarea
              className="modal-textarea"
              placeholder="Conteúdo do template..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={10}
            />
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim() || !content.trim()}>
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="template-list">
              {templates.length === 0 ? (
                <p className="empty-list-msg">Nenhum template. Crie um para reutilizar contextos.</p>
              ) : (
                templates.map(tpl => (
                  <div key={tpl.id} className="template-item">
                    <div className="template-item-info">
                      <div className="template-item-name">{tpl.name}</div>
                      <div className="template-item-preview">{tpl.content.slice(0, 80)}…</div>
                    </div>
                    <div className="template-item-actions">
                      {onSelect && (
                        <button className="btn-link" onClick={() => onSelect(tpl)}>Usar</button>
                      )}
                      <button className="btn-link" onClick={() => openEdit(tpl)}>Editar</button>
                      <button className="btn-link btn-link-danger" onClick={() => handleDelete(tpl.id)}>Deletar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={openNew}>+ Novo template</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
