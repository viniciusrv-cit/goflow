import { useState, useEffect } from 'react';
import { contextLibraryService } from '../services/profileService';

export default function ContextLibrary({ onClose, onSelect }) {
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewingVersions, setViewingVersions] = useState(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => setEntries(await contextLibraryService.getAll());

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    if (editing === 'new') {
      await contextLibraryService.create(name.trim(), content.trim());
    } else {
      await contextLibraryService.addVersion(editing.id, content.trim());
    }
    setEditing(null);
    load();
  };

  const handleRevert = async (entryId, versionIndex) => {
    await contextLibraryService.revertToVersion(entryId, versionIndex);
    load();
    setViewingVersions(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar este contexto?')) return;
    await contextLibraryService.delete(id);
    load();
  };

  const openNew = () => { setEditing('new'); setName(''); setContent(''); };
  const openEdit = (entry) => {
    setEditing(entry);
    setName(entry.name);
    setContent(contextLibraryService.getCurrentContent(entry));
  };

  if (viewingVersions) {
    return (
      <div className="modal-overlay">
        <div className="modal-box modal-large">
          <div className="modal-header">
            <h2>Versões — {viewingVersions.name}</h2>
            <button className="modal-close" onClick={() => setViewingVersions(null)}>✕</button>
          </div>
          <div className="template-list">
            {[...viewingVersions.versions].reverse().map((v, i) => {
              const originalIdx = viewingVersions.versions.length - 1 - i;
              const isCurrent = originalIdx === viewingVersions.versions.length - 1;
              return (
                <div key={i} className="template-item">
                  <div className="template-item-info">
                    <div className="template-item-name">
                      {isCurrent ? 'Versão atual' : `Versão ${originalIdx + 1}`}
                      <span className="version-date"> · {new Date(v.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="template-item-preview">{v.content.slice(0, 100)}…</div>
                  </div>
                  {!isCurrent && (
                    <button className="btn-link" onClick={() => handleRevert(viewingVersions.id, originalIdx)}>
                      Restaurar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-large">
        <div className="modal-header">
          <h2>Biblioteca de Contextos</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {editing ? (
          <div className="template-form">
            <input
              className="template-name-input"
              placeholder="Nome do contexto"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={editing !== 'new'}
            />
            <textarea
              className="modal-textarea"
              placeholder="Conteúdo do contexto..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={12}
            />
            {editing !== 'new' && (
              <p className="modal-hint">Salvar criará uma nova versão sem apagar as anteriores.</p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim() || !content.trim()}>
                {editing === 'new' ? 'Criar' : 'Salvar nova versão'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="template-list">
              {entries.length === 0 ? (
                <p className="empty-list-msg">Nenhum contexto salvo ainda.</p>
              ) : (
                entries.map(entry => (
                  <div key={entry.id} className="template-item">
                    <div className="template-item-info">
                      <div className="template-item-name">
                        {entry.name}
                        <span className="version-badge">{entry.versions.length}v</span>
                      </div>
                      <div className="template-item-preview">
                        {contextLibraryService.getCurrentContent(entry).slice(0, 80)}…
                      </div>
                    </div>
                    <div className="template-item-actions">
                      {onSelect && (
                        <button className="btn-link" onClick={() => onSelect(entry)}>Usar</button>
                      )}
                      <button className="btn-link" onClick={() => openEdit(entry)}>Editar</button>
                      <button className="btn-link" onClick={() => setViewingVersions(entry)}>Versões</button>
                      <button className="btn-link btn-link-danger" onClick={() => handleDelete(entry.id)}>Deletar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={openNew}>+ Novo contexto</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
