import { useState, useEffect, useRef } from 'react';
import { chatService } from '../services/profileService';
import { apiService } from '../services/apiService';
import ConversationList from './ConversationList';
import ChatInput from './ChatInput';
import ProfileIndicator from './ProfileIndicator';
import Menu from './Menu';

export default function ChatWindow({ profile, onSettingsClick, onChangeProfile, profiles }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const convs = await chatService.getConversationsByProfile(profile.id);
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConversation(convs[0]);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };

    loadConversations();
  }, [profile.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleNewConversation = async () => {
    try {
      const newConv = await chatService.createConversation(profile.id, 'Nova conversa');
      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      setError('');
    } catch (err) {
      setError('Erro ao criar conversa');
    }
  };

  const handleSendMessage = async (message) => {
    if (!activeConversation) return;

    setError('');
    setIsLoading(true);

    try {
      const userMsg = await chatService.addMessage(activeConversation.id, 'user', message);
      
      const updated = await chatService.getConversation(activeConversation.id);
      setActiveConversation(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));

      const messages = updated.messages;
      const response = await apiService.sendMessage(profile, messages);

      const assistantMsg = await chatService.addMessage(activeConversation.id, 'assistant', response);
      const finalUpdated = await chatService.getConversation(activeConversation.id);
      setActiveConversation(finalUpdated);
      setConversations(prev => prev.map(c => c.id === finalUpdated.id ? finalUpdated : c));

      if (messages.length === 1) {
        const title = message.substring(0, 50);
        await chatService.updateConversationTitle(activeConversation.id, title);
        const renamed = await chatService.getConversation(activeConversation.id);
        setActiveConversation(renamed);
        setConversations(prev => prev.map(c => c.id === renamed.id ? renamed : c));
      }
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await chatService.deleteConversation(convId);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      
      if (activeConversation?.id === convId) {
        setActiveConversation(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      setError('Erro ao deletar conversa');
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setSidebarOpen(false);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        
        <ProfileIndicator profile={profile} />
        
        <button
          className="menu-button"
          onClick={() => setShowMenu(!showMenu)}
        >
          ⋮
        </button>

        {showMenu && (
          <Menu
            onSettingsClick={() => {
              setShowMenu(false);
              onSettingsClick();
            }}
            onChangeProfile={() => {
              setShowMenu(false);
              onChangeProfile();
            }}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>

      <div className="chat-main">
        <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button
            className="new-conversation-btn"
            onClick={handleNewConversation}
          >
            + Nova conversa
          </button>

          <ConversationList
            conversations={conversations}
            activeConversation={activeConversation}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </aside>

        <div className="chat-area">
          {!activeConversation ? (
            <div className="empty-chat">
              <h2>Nenhuma conversa ativa</h2>
              <button
                className="btn btn-primary"
                onClick={handleNewConversation}
              >
                Iniciar conversa
              </button>
            </div>
          ) : (
            <>
              <div className="messages-container">
                {activeConversation.messages.map((msg, idx) => (
                  <div key={idx} className={`message message-${msg.role}`}>
                    <div className="message-role">{msg.role === 'user' ? 'Você' : 'Claude'}</div>
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {error && <div className="chat-error">{error}</div>}

              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
