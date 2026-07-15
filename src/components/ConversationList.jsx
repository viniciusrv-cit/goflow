import { useState } from 'react';
import TagSelector from './TagSelector';

export default function ConversationList({
  conversations, activeConversation, pendingConvIds, allTags,
  onSelectConversation, onDeleteConversation, onTogglePin,
  onToggleArchive, onDuplicate, onEditTitle, onTagsChange
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [tagSelectorId, setTagSelectorId] = useState(null);

  const startEdit = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuId(null);
  };

  const commitEdit = async (convId) => {
    if (editTitle.trim()) await onEditTitle(convId, editTitle.trim());
    setEditingId(null);
  };

  const tagName = (id) => allTags.find(t => t.id === id)?.name ?? id;

  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-list"><p>Nenhuma conversa</p></div>
      ) : (
        conversations.map(conv => {
          const isPending = pendingConvIds?.has(conv.id);
          const isActive = activeConversation?.id === conv.id;

          return (
            <div key={conv.id} className={`conversation-item ${isActive ? 'active' : ''}`}>
              <div
                className="conversation-item-content"
                onClick={() => { setMenuId(null); onSelectConversation(conv); }}
              >
                {editingId === conv.id ? (
                  <input
                    className="conv-title-edit"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => commitEdit(conv.id)}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(conv.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="conversation-item-title">
                    {conv.pinned && <span className="pin-dot">·</span>}
                    {conv.title}
                    {isPending && <span className="conv-pending-dot" title="Resposta pendente" />}
                  </div>
                )}
                {conv.tags?.length > 0 && (
                  <div className="conv-tags">
                    {conv.tags.slice(0, 2).map(id => (
                      <span key={id} className="conv-tag-chip">{tagName(id)}</span>
                    ))}
                  </div>
                )}
                <div className="conversation-item-date">
                  {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Context menu */}
              <div className="conv-menu-wrap">
                <button
                  className="conversation-item-delete"
                  onClick={e => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id); }}
                >
                  ⋮
                </button>
                {menuId === conv.id && (
                  <div className="conv-context-menu" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => startEdit(conv, e)}>Renomear</button>
                    <button onClick={() => { onTogglePin(conv.id); setMenuId(null); }}>
                      {conv.pinned ? 'Desafixar' : 'Fixar'}
                    </button>
                    <button onClick={() => { setTagSelectorId(conv.id); setMenuId(null); }}>
                      Tags
                    </button>
                    <button onClick={() => { onDuplicate(conv.id); setMenuId(null); }}>
                      Duplicar
                    </button>
                    <button onClick={() => { onToggleArchive(conv.id); setMenuId(null); }}>
                      {conv.archived ? 'Restaurar' : 'Arquivar'}
                    </button>
                    <button
                      className="conv-menu-danger"
                      onClick={() => {
                        if (confirm('Deletar esta conversa?')) { onDeleteConversation(conv.id); }
                        setMenuId(null);
                      }}
                    >
                      Deletar
                    </button>
                  </div>
                )}
              </div>

              {tagSelectorId === conv.id && (
                <TagSelector
                  selectedTags={conv.tags || []}
                  onChange={tags => { onTagsChange(conv.id, tags); }}
                  onClose={() => setTagSelectorId(null)}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
