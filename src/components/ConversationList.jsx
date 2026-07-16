export default function ConversationList({
  conversations, activeConversation, pendingConvId, onSelectConversation
}) {
  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-list"><p>Nenhuma conversa</p></div>
      ) : (
        conversations.map(conv => {
          const isPending = pendingConvId === conv.id;
          const isActive = activeConversation?.id === conv.id;

          return (
            <div
              key={conv.id}
              className={`conversation-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv)}
            >
              <div className="conversation-item-content">
                <div className="conversation-item-title">
                  {conv.pinned && <span className="pin-dot">· </span>}
                  {conv.title}
                  {isPending && <span className="conv-pending-dot" title="Resposta pendente" />}
                </div>
                <div className="conversation-item-date">
                  {new Date(conv.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
