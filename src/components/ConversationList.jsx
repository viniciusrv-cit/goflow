export default function ConversationList({
  conversations,
  activeConversation,
  onSelectConversation,
  onDeleteConversation
}) {
  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-list">
          <p>Nenhuma conversa</p>
        </div>
      ) : (
        conversations.map(conv => (
          <div
            key={conv.id}
            className={`conversation-item ${
              activeConversation?.id === conv.id ? 'active' : ''
            }`}
            onClick={() => onSelectConversation(conv)}
          >
            <div className="conversation-item-content">
              <div className="conversation-item-title">{conv.title}</div>
              <div className="conversation-item-date">
                {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <button
              className="conversation-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Deletar esta conversa?')) {
                  onDeleteConversation(conv.id);
                }
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}
