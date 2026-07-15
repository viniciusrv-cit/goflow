import { useState, useRef, useEffect } from 'react';
import FileImport from './FileImport';

export default function ChatInput({ onSendMessage, isLoading, isOnline, onFileExtracted, onOpenTemplates, onOpenContextLibrary }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading || !isOnline) return;
    onSendMessage(message.trim());
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-toolbar">
        <FileImport onExtracted={onFileExtracted} />
        <button
          type="button"
          className="chat-toolbar-btn"
          onClick={onOpenTemplates}
          title="Templates"
        >
          ⊞
        </button>
        <button
          type="button"
          className="chat-toolbar-btn"
          onClick={onOpenContextLibrary}
          title="Biblioteca de contextos"
        >
          ⊟
        </button>
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isOnline ? 'Digite sua mensagem...' : 'Sem conexão — envio bloqueado'}
          disabled={isLoading || !isOnline}
          rows="1"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isLoading || !message.trim() || !isOnline}
        >
          {isLoading ? '⟳' : '→'}
        </button>
      </form>
    </div>
  );
}
