import { useState, useRef, useEffect } from 'react';
import FileImport from './FileImport';

export default function ChatInput({
  onSendMessage, isLoading, isOnline,
  onFileExtracted, onOpenTemplates, onOpenContextLibrary,
  blockingConvTitle
}) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading || !isOnline || blockingConvTitle) return;
    onSendMessage(message.trim());
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const isDisabled = isLoading || !isOnline || !!blockingConvTitle;

  let placeholder = 'Digite sua mensagem...';
  if (!isOnline) placeholder = 'Sem conexão — envio bloqueado';
  else if (blockingConvTitle) placeholder = `Aguardando resposta em "${blockingConvTitle}"`;

  return (
    <div className="chat-input-area">
      <div className="chat-input-toolbar">
        <FileImport onExtracted={onFileExtracted} />
        <button type="button" className="chat-toolbar-btn" onClick={onOpenTemplates} title="Templates">⊞</button>
        <button type="button" className="chat-toolbar-btn" onClick={onOpenContextLibrary} title="Biblioteca de contextos">⊟</button>
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={isDisabled}
          rows="1"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={isDisabled || !message.trim()}
        >
          {isLoading ? '⟳' : '→'}
        </button>
      </form>
    </div>
  );
}
