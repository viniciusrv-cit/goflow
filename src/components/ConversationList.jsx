import { useState } from 'react';

export default function ConversationList({
  conversations, activeConversation, pendingConvId,
  onSelectConversation, onDeleteConversation,
  onTogglePin, onToggleArchive, onDuplicate, onEditTitle
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuId, setMenuId] = useState(null);

  const startEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuId(null);
  };

  const commitEdit = async (convId) => {
    const title = editTitle.trim();
    if (title) await onEditTitle(convId, title);
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-list"><p>Nenhuma conversa</p></div>
      ) : (
        conversations.map(conv => {
          const isPending = pendingConvId === conv.id;
          const isActive = activeConversation?.id === conv.id;

          return (
            <div key={conv.id} className={`conversation-item ${isActive ? 'active' : ''}`}>
              <div
                className="conversation-item-content"
                onClick={() => { setMenuId(null); onSelectConversation(conv); }}
              >
                {editingId === conv.id ? (
                  <div className="conv-rename-row" onClick={e => e.stopPropagation()}>
                    <input
                      className="conv-title-edit"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(conv.id); if (e.key === 'Escape') cancelEdit(); }}
                      autoFocus
                    />
                    <button className="rename-confirm-btn" onClick={() => commitEdit(conv.id)} title="Salvar">✓</button>
                    <button className="rename-cancel-btn" onClick={cancelEdit} title="Cancelar">✕</button>
                  </div>
                ) : (
                  <div className="conversation-item-title">
                    {conv.pinned && <span className="pin-dot">· </span>}
                    {conv.title}
                    {isPending && <span className="conv-pending-dot" title="Resposta pendente" />}
                  </div>
                )}
                <div className="conversation-item-date">
                  {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="conv-menu-wrap">
                <button
                  className="conversation-item-delete"
                  onClick={e => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id); }}
                >
                  ⋮
                </button>
                {menuId === conv.id && (
                  <>
                    <div className="menu-backdrop" onClick={() => setMenuId(null)} />
                    <div className="conv-context-menu">
                      <button onClick={e => startEdit(conv, e)}>Renomear</button>
                      <button onClick={() => { onTogglePin(conv.id); setMenuId(null); }}>
                        {conv.pinned ? 'Desafixar' : 'Fixar'}
                      </button>
                      <button onClick={() => { onDuplicate(conv.id); setMenuId(null); }}>Duplicar</button>
                      <button onClick={() => { onToggleArchive(conv.id); setMenuId(null); }}>
                        {conv.archived ? 'Restaurar' : 'Arquivar'}
                      </button>
                      <button
                        className="conv-menu-danger"
                        onClick={() => {
                          if (confirm('Deletar esta conversa?')) onDeleteConversation(conv.id);
                          setMenuId(null);
                        }}
                      >
                        Deletar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
