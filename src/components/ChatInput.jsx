import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSendMessage, isLoading }) {
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
    if (!message.trim() || isLoading) return;

    onSendMessage(message.trim());
    setMessage('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
        disabled={isLoading}
        rows="1"
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={isLoading || !message.trim()}
      >
        {isLoading ? '⟳' : '→'}
      </button>
    </form>
  );
}
