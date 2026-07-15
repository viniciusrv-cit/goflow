import { useState } from 'react';

export default function MessageBubble({ msg, onShare }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = msg.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: msg.content });
      } catch (e) {
        if (e.name !== 'AbortError') handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={`message message-${msg.role}`}>
      <div className="message-role">{msg.role === 'user' ? 'Você' : 'Assistente'}</div>
      <div className="message-content">{msg.content}</div>
      <div className="message-footer">
        <span className="message-time">
          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="message-actions">
          <button className="msg-action-btn" onClick={handleCopy} title="Copiar">
            {copied ? '✓' : '⎘'}
          </button>
          {msg.role === 'assistant' && (
            <button className="msg-action-btn" onClick={handleShare} title="Compartilhar">
              ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
