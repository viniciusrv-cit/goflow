import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, latencyService, pendingRequestService } from '../services/profileService';
import { apiService } from '../services/apiService';
import ConversationList from './ConversationList';
import ChatInput from './ChatInput';
import ProfileIndicator from './ProfileIndicator';
import MessageBubble from './MessageBubble';
import ProgressBar from './ProgressBar';
import PreviewModal from './PreviewModal';
import TemplateManager from './TemplateManager';
import ContextLibrary from './ContextLibrary';
import { contextLibraryService } from '../services/profileService';

export default function ChatWindow({ profile, onSettingsClick, onChangeProfile, onOpenDiagnostics }) {
  // Navigation
  const [view, setView] = useState('list'); // 'list' | 'chat'
  const chatEntryPushed = useRef(false); // tracks whether we pushed a history entry

  // Data
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Request state — single pending request at a time (Option A)
  const [pendingConvId, setPendingConvId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryInfo, setRetryInfo] = useState(null);
  const [estimatedMs, setEstimatedMs] = useState(null);
  const [requestStart, setRequestStart] = useState(null);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Menus & modals
  const [showMenu, setShowMenu] = useState(false);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showContextLibrary, setShowContextLibrary] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const messagesEndRef = useRef(null);
  const titleInputRef = useRef(null);

  // ── Online/offline ──────────────────────────────────────────────
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // ── Android hardware back button via History API ────────────────
  useEffect(() => {
    const handler = () => {
      // popstate fires when we pop the state we pushed on entering chat
      if (chatEntryPushed.current) {
        chatEntryPushed.current = false;
        goToListInternal();
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Conversations ────────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    const convs = await chatService.getConversationsByProfile(profile.id, showArchivedOnly);
    setConversations(convs);
    return convs;
  }, [profile.id, showArchivedOnly]);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  // ── Auto scroll ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length]);

  // ── Focus title input ────────────────────────────────────────────
  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);

  // ── Navigation helpers ───────────────────────────────────────────
  function goToListInternal() {
    setView('list');
    setEditingTitle(false);
    setShowConvMenu(false);
    setShowMenu(false);
    setError('');
  }

  // Navigate to chat: push a history entry for Android back support
  function goToChat(conv) {
    setActiveConversation(conv);
    setEditingTitle(false);
    setShowConvMenu(false);
    setShowMenu(false);
    setError('');
    if (!chatEntryPushed.current) {
      window.history.pushState({ goflow: 'chat' }, '');
      chatEntryPushed.current = true;
    }
    setView('chat');
  }

  // Navigate back to list: pop the history entry → triggers popstate → goToListInternal
  function goToList() {
    if (chatEntryPushed.current) {
      window.history.back(); // triggers popstate handler
    } else {
      goToListInternal();
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────
  const handleNewConversation = async () => {
    setShowMenu(false); // ensure menu/backdrop are closed
    const newConv = await chatService.createConversation(profile.id, 'Nova conversa');
    await refreshConversations();
    goToChat(newConv);
  };

  const handleSelectConversation = (conv) => goToChat(conv);

  // Title editing
  const startTitleEdit = () => {
    setTitleDraft(activeConversation?.title || '');
    setEditingTitle(true);
    setShowConvMenu(false);
  };

  const commitTitleEdit = async () => {
    if (!activeConversation) return;
    const title = titleDraft.trim() || activeConversation.messages[0]?.content?.slice(0, 50) || 'Nova conversa';
    await chatService.updateConversationTitle(activeConversation.id, title);
    const convs = await refreshConversations();
    setActiveConversation(convs.find(c => c.id === activeConversation.id) || activeConversation);
    setEditingTitle(false);
  };

  // Core send
  const handleSendMessage = useCallback(async (message) => {
    if (!activeConversation || !isOnline || pendingConvId) return;

    setError('');
    setRetryInfo(null);
    setPendingConvId(activeConversation.id);
    setIsLoading(true);

    const start = Date.now();
    setRequestStart(start);
    const avg = await latencyService.getAverage(profile.id);
    setEstimatedMs(avg);

    await pendingRequestService.save(activeConversation.id, message);

    try {
      await chatService.addMessage(activeConversation.id, 'user', message);
      const conv = await chatService.getConversation(activeConversation.id);
      setActiveConversation(conv);

      const response = await apiService.sendMessage(profile, conv.messages, {
        onRetry: (attempt, delay) => setRetryInfo({ attempt, delay: Math.round(delay / 1000) })
      });

      setRetryInfo(null);

      if (conv.messages.filter(m => m.role === 'user').length === 1) {
        await chatService.updateConversationTitle(activeConversation.id, message.substring(0, 50));
      }

      await chatService.addMessage(activeConversation.id, 'assistant', response);
      await pendingRequestService.clear(activeConversation.id);

      const final = await chatService.getConversation(activeConversation.id);
      setActiveConversation(final);
      await refreshConversations();

    } catch (err) {
      await pendingRequestService.clear(activeConversation.id);
      setError(err.message || 'Erro ao enviar mensagem');
    } finally {
      setPendingConvId(null);
      setIsLoading(false);
      setRequestStart(null);
      setEstimatedMs(null);
    }
  }, [activeConversation, isOnline, pendingConvId, profile, refreshConversations]);

  const handlePreviewConfirm = (content) => { setPreview(null); handleSendMessage(content); };
  const handleTemplateSelect = (tpl) => { setShowTemplates(false); setPreview({ content: tpl.content, label: `Template: ${tpl.name}` }); };
  const handleContextSelect = (entry) => { setShowContextLibrary(false); setPreview({ content: contextLibraryService.getCurrentContent(entry), label: `Contexto: ${entry.name}` }); };

  const handleDeleteConversation = async (convId) => {
    await chatService.deleteConversation(convId);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) {
      setActiveConversation(convs[0] ?? null);
      goToListInternal();
    }
  };

  const handleTogglePin = async (convId) => {
    await chatService.togglePin(convId);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) setActiveConversation(convs.find(c => c.id === convId));
    setShowConvMenu(false);
  };

  const handleToggleArchive = async (convId) => {
    await chatService.toggleArchive(convId);
    await refreshConversations();
    if (activeConversation?.id === convId) { setActiveConversation(null); goToListInternal(); }
    setShowConvMenu(false);
  };

  const handleDuplicate = async (convId) => {
    const dup = await chatService.duplicateConversation(convId);
    await refreshConversations();
    goToChat(dup);
  };

  const handleEditTitleFromList = async (convId, newTitle) => {
    await chatService.updateConversationTitle(convId, newTitle);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) setActiveConversation(convs.find(c => c.id === convId));
  };

  const handleExport = () => {
    if (!activeConversation) return;
    const md = chatService.exportAsMarkdown(activeConversation);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowConvMenu(false);
  };

  const pendingConvTitle = pendingConvId && pendingConvId !== activeConversation?.id
    ? conversations.find(c => c.id === pendingConvId)?.title
    : null;

  const filteredConvs = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) ||
      c.messages?.some(m => m.content.toLowerCase().includes(q));
  });

  // ── List screen ─────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="screen">
        {!isOnline && <div className="offline-banner">Sem conexão — leitura disponível, envio bloqueado</div>}

        <div className="screen-header">
          <div className="app-title-wrap">
            <h1 className="app-title">GoFlow</h1>
            <span className="app-version">v1.0.0</span>
          </div>
          <ProfileIndicator profile={profile} />
          <button className="menu-button" onClick={() => setShowMenu(v => !v)}>⋮</button>
          {showMenu && (
            <>
              <div className="menu-backdrop" onClick={() => setShowMenu(false)} />
              <div className="menu-dropdown">
                <button className="menu-item" onClick={() => { setShowMenu(false); setShowContextLibrary(true); }}>Biblioteca de contextos</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); onChangeProfile(); }}>Trocar profile</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); onSettingsClick(); }}>Configurações</button>
                {onOpenDiagnostics && (
                  <button className="menu-item" onClick={() => { setShowMenu(false); onOpenDiagnostics(); }}>Diagnóstico de gateway</button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="screen-body">
          <button className="new-conv-btn-main" onClick={handleNewConversation}>
            + Nova conversa
          </button>

          <div className="search-wrap">
            <input
              className="search-input"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="archive-toggle" onClick={() => setShowArchivedOnly(v => !v)}>
            {showArchivedOnly ? '← Ver conversas ativas' : 'Ver arquivadas'}
          </button>

          <ConversationList
            conversations={filteredConvs}
            activeConversation={activeConversation}
            pendingConvId={pendingConvId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onDuplicate={handleDuplicate}
            onEditTitle={handleEditTitleFromList}
          />
        </div>

        {showContextLibrary && <ContextLibrary onClose={() => setShowContextLibrary(false)} onSelect={handleContextSelect} />}
        {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} onSelect={handleTemplateSelect} />}
        {preview && <PreviewModal initialContent={preview.content} sourceLabel={preview.label} onConfirm={handlePreviewConfirm} onCancel={() => setPreview(null)} />}
      </div>
    );
  }

  // ── Chat screen ─────────────────────────────────────────────────
  // Guard: if somehow we got here without an active conversation, go back
  if (!activeConversation) {
    goToListInternal();
    return null;
  }

  return (
    <div className="screen">
      {!isOnline && <div className="offline-banner">Sem conexão — leitura disponível, envio bloqueado</div>}

      <div className="screen-header">
        <button className="back-btn-chat" onClick={goToList}>←</button>

        {editingTitle ? (
          <div className="title-edit-wrap">
            <input
              ref={titleInputRef}
              className="title-edit-input"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitTitleEdit(); if (e.key === 'Escape') setEditingTitle(false); }}
            />
            <button className="title-edit-confirm" onClick={commitTitleEdit}>✓</button>
            <button className="title-edit-cancel" onClick={() => setEditingTitle(false)}>✕</button>
          </div>
        ) : (
          <div className="chat-header-title" onClick={startTitleEdit} title="Toque para renomear">
            {activeConversation.pinned && <span className="pin-indicator">📌 </span>}
            <span className="title-text">{activeConversation.title || 'Nova conversa'}</span>
          </div>
        )}

        <button className="menu-button" onClick={() => setShowConvMenu(v => !v)}>⋮</button>
        {showConvMenu && (
          <>
            <div className="menu-backdrop" onClick={() => setShowConvMenu(false)} />
            <div className="menu-dropdown">
              <button className="menu-item" onClick={startTitleEdit}>Renomear</button>
              <button className="menu-item" onClick={() => handleTogglePin(activeConversation.id)}>
                {activeConversation.pinned ? 'Desafixar' : 'Fixar'}
              </button>
              <button className="menu-item" onClick={() => handleDuplicate(activeConversation.id)}>Duplicar</button>
              <button className="menu-item" onClick={handleExport}>Exportar (.md)</button>
              <button className="menu-item" onClick={() => handleToggleArchive(activeConversation.id)}>
                {activeConversation.archived ? 'Restaurar' : 'Arquivar'}
              </button>
              <button className="menu-item menu-item-danger" onClick={() => {
                setShowConvMenu(false);
                if (confirm('Deletar esta conversa?')) handleDeleteConversation(activeConversation.id);
              }}>
                Deletar
              </button>
            </div>
          </>
        )}
      </div>

      {isLoading && pendingConvId === activeConversation.id && (
        <ProgressBar estimatedMs={estimatedMs} startedAt={requestStart} />
      )}

      <div className="messages-container">
        {activeConversation.messages.length === 0 && (
          <div className="empty-chat-hint">Nenhuma mensagem ainda. Escreva abaixo para começar.</div>
        )}
        {activeConversation.messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isLoading && pendingConvId === activeConversation.id && (
          <div className="loading-bubble">
            {retryInfo
              ? `Tentando novamente (${retryInfo.attempt}ª tentativa, aguarde ${retryInfo.delay}s)...`
              : estimatedMs
                ? `Aguardando resposta (~${Math.round(estimatedMs / 1000)}s estimado)...`
                : 'Aguardando resposta...'
            }
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
          <button className="error-dismiss" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading && pendingConvId === activeConversation.id}
        isOnline={isOnline}
        blockingConvTitle={pendingConvTitle}
        onFileExtracted={(text, filename) => setPreview({ content: text, label: `Arquivo: ${filename}` })}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenContextLibrary={() => setShowContextLibrary(true)}
      />

      {preview && <PreviewModal initialContent={preview.content} sourceLabel={preview.label} onConfirm={handlePreviewConfirm} onCancel={() => setPreview(null)} />}
      {showTemplates && <TemplateManager onClose={() => setShowTemplates(false)} onSelect={handleTemplateSelect} />}
      {showContextLibrary && <ContextLibrary onClose={() => setShowContextLibrary(false)} onSelect={handleContextSelect} />}
    </div>
  );
}
