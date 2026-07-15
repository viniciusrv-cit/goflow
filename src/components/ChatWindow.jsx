import { useState, useEffect, useRef, useCallback } from 'react';
import { chatService, latencyService, pendingRequestService, tagService } from '../services/profileService';
import { apiService } from '../services/apiService';
import ConversationList from './ConversationList';
import ChatInput from './ChatInput';
import ProfileIndicator from './ProfileIndicator';
import Menu from './Menu';
import MessageBubble from './MessageBubble';
import ProgressBar from './ProgressBar';
import PreviewModal from './PreviewModal';
import TemplateManager from './TemplateManager';
import ContextLibrary from './ContextLibrary';
import ThemeSettings from './ThemeSettings';
import { contextLibraryService } from '../services/profileService';

export default function ChatWindow({ profile, onSettingsClick, onChangeProfile, onOpenDiagnostics, profiles }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [pendingConvIds, setPendingConvIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryInfo, setRetryInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [estimatedMs, setEstimatedMs] = useState(null);
  const [requestStart, setRequestStart] = useState(null);
  const [preview, setPreview] = useState(null); // { content, label }
  const [showTemplates, setShowTemplates] = useState(false);
  const [showContextLibrary, setShowContextLibrary] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [filterTag, setFilterTag] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const messagesEndRef = useRef(null);
  const requestQueue = useRef({}); // convId -> promise

  // Online/offline detection (#18)
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const convs = await chatService.getConversationsByProfile(profile.id, showArchivedOnly);
        setConversations(convs);
        if (!activeConversation && convs.length > 0) setActiveConversation(convs[0]);
        const tags = await tagService.getAll();
        setAllTags(tags);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    };
    load();
  }, [profile.id, showArchivedOnly]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages?.length]);

  const refreshConversations = useCallback(async () => {
    const convs = await chatService.getConversationsByProfile(profile.id, showArchivedOnly);
    setConversations(convs);
    return convs;
  }, [profile.id, showArchivedOnly]);

  const handleNewConversation = async () => {
    const newConv = await chatService.createConversation(profile.id, 'Nova conversa');
    await refreshConversations();
    setActiveConversation(newConv);
    setError('');
    setSidebarOpen(false);
  };

  // Core send logic — async queue per conversation (#1, #2, #3, #4)
  const sendMessage = useCallback(async (convId, message) => {
    if (!isOnline) { setError('Sem conexão. Envio bloqueado.'); return; }
    if (requestQueue.current[convId]) return; // one pending per conversation

    setError('');
    setRetryInfo(null);
    setPendingConvIds(s => new Set([...s, convId]));

    // Persist pending state (#1)
    await pendingRequestService.save(convId, message);

    const start = Date.now();
    setRequestStart(start);

    const avg = await latencyService.getAverage(profile.id);
    setEstimatedMs(avg);

    // Page Visibility API: only show loading UI when this conv is active
    const isActive = () => activeConversation?.id === convId;

    const run = async () => {
      try {
        if (isActive()) setIsLoading(true);

        // Add user message
        await chatService.addMessage(convId, 'user', message);
        const conv = await chatService.getConversation(convId);
        if (isActive()) setActiveConversation(conv);

        const response = await apiService.sendMessage(profile, conv.messages, {
          onRetry: (attempt, delay) => {
            if (isActive()) setRetryInfo({ attempt, delay: Math.round(delay / 1000) });
          }
        });

        setRetryInfo(null);

        // Auto-title on first message
        if (conv.messages.filter(m => m.role === 'user').length === 1) {
          await chatService.updateConversationTitle(convId, message.substring(0, 50));
        }

        await chatService.addMessage(convId, 'assistant', response);
        await pendingRequestService.clear(convId);

        const final = await chatService.getConversation(convId);
        if (isActive()) setActiveConversation(final);
        await refreshConversations();

        // Notify if not in focus (#2)
        if (!isActive() && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('GoFlow', { body: `Resposta recebida em "${final.title}"`, icon: '/pwa-192x192.png' });
        }

      } catch (err) {
        await pendingRequestService.clear(convId);
        if (isActive()) setError(err.message || 'Erro ao enviar mensagem');
      } finally {
        delete requestQueue.current[convId];
        setPendingConvIds(s => { const n = new Set(s); n.delete(convId); return n; });
        if (isActive()) { setIsLoading(false); setRequestStart(null); setEstimatedMs(null); }
      }
    };

    requestQueue.current[convId] = run();
    await requestQueue.current[convId];
  }, [activeConversation, isOnline, profile, refreshConversations]);

  const handleSendMessage = (message) => {
    if (!activeConversation) return;
    sendMessage(activeConversation.id, message);
  };

  const handlePreviewConfirm = (content) => {
    setPreview(null);
    handleSendMessage(content);
  };

  const handleTemplateSelect = (tpl) => {
    setShowTemplates(false);
    setPreview({ content: tpl.content, label: `Template: ${tpl.name}` });
  };

  const handleContextSelect = (entry) => {
    setShowContextLibrary(false);
    const content = contextLibraryService.getCurrentContent(entry);
    setPreview({ content, label: `Contexto: ${entry.name}` });
  };

  // P2: Title editing (#9)
  const handleEditTitle = async (convId, newTitle) => {
    await chatService.updateConversationTitle(convId, newTitle);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) {
      const updated = convs.find(c => c.id === convId);
      if (updated) setActiveConversation(updated);
    }
  };

  // P2: Pin (#10)
  const handleTogglePin = async (convId) => {
    await chatService.togglePin(convId);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) {
      setActiveConversation(convs.find(c => c.id === convId) || activeConversation);
    }
  };

  // P2: Archive (#14)
  const handleToggleArchive = async (convId) => {
    await chatService.toggleArchive(convId);
    await refreshConversations();
    if (activeConversation?.id === convId) setActiveConversation(null);
  };

  // P2: Duplicate (#13)
  const handleDuplicate = async (convId) => {
    const dup = await chatService.duplicateConversation(convId);
    await refreshConversations();
    setActiveConversation(dup);
    setSidebarOpen(false);
  };

  // P2: Delete
  const handleDeleteConversation = async (convId) => {
    await chatService.deleteConversation(convId);
    const convs = await refreshConversations();
    if (activeConversation?.id === convId) {
      setActiveConversation(convs.length > 0 ? convs[0] : null);
    }
  };

  // P2: Tags (#12)
  const handleTagsChange = async (convId, tags) => {
    await chatService.setTags(convId, tags);
    await refreshConversations();
  };

  // P4: Export (#19)
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
  };

  // Request notifications permission
  const requestNotifPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Filtered conversations for display (#11)
  const filteredConvs = conversations.filter(c => {
    if (filterTag && !c.tags?.includes(filterTag)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages?.some(m => m.content.toLowerCase().includes(q));
  });

  const pendingCount = pendingConvIds.size - (pendingConvIds.has(activeConversation?.id) ? 1 : 0);

  return (
    <div className="chat-window">
      {!isOnline && <div className="offline-banner">Sem conexão — leitura disponível, envio bloqueado</div>}

      <div className="chat-header">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
          {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
        </button>

        <ProfileIndicator profile={profile} />

        <button className="menu-button" onClick={() => setShowMenu(!showMenu)}>⋮</button>

        {showMenu && (
          <Menu
            onSettingsClick={() => { setShowMenu(false); onSettingsClick(); }}
            onChangeProfile={() => { setShowMenu(false); onChangeProfile(); }}
            onOpenDiagnostics={() => { setShowMenu(false); onOpenDiagnostics?.(); }}
            onExport={() => { setShowMenu(false); handleExport(); }}
            onTheme={() => { setShowMenu(false); setShowTheme(true); }}
            onContextLibrary={() => { setShowMenu(false); setShowContextLibrary(true); }}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>

      <div className="chat-main">
        <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button className="new-conversation-btn" onClick={handleNewConversation}>
            + Nova conversa
          </button>

          {/* Search (#11) */}
          <div className="sidebar-search">
            <input
              className="search-input"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tag filter (#12) */}
          {allTags.length > 0 && (
            <div className="tag-filter">
              <button
                className={`tag-chip-sm ${!filterTag ? 'active' : ''}`}
                onClick={() => setFilterTag(null)}
              >
                Todas
              </button>
              {allTags.map(t => (
                <button
                  key={t.id}
                  className={`tag-chip-sm ${filterTag === t.id ? 'active' : ''}`}
                  onClick={() => setFilterTag(filterTag === t.id ? null : t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Archive toggle (#14) */}
          <button
            className="archive-toggle"
            onClick={() => setShowArchivedOnly(v => !v)}
          >
            {showArchivedOnly ? '← Ativas' : 'Arquivadas →'}
          </button>

          <ConversationList
            conversations={filteredConvs}
            activeConversation={activeConversation}
            pendingConvIds={pendingConvIds}
            allTags={allTags}
            onSelectConversation={(conv) => { setActiveConversation(conv); setSidebarOpen(false); }}
            onDeleteConversation={handleDeleteConversation}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onDuplicate={handleDuplicate}
            onEditTitle={handleEditTitle}
            onTagsChange={handleTagsChange}
          />
        </aside>

        <div className="chat-area" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          {!activeConversation ? (
            <div className="empty-chat">
              <h2>Nenhuma conversa ativa</h2>
              <button className="btn btn-primary" onClick={handleNewConversation}>
                Iniciar conversa
              </button>
            </div>
          ) : (
            <>
              {/* Active conversation title bar */}
              <div className="conv-title-bar">
                <span className="conv-title-text">{activeConversation.title}</span>
                {activeConversation.pinned && <span className="pin-indicator" title="Fixada">📌</span>}
              </div>

              {/* Progress bar (#3) */}
              {isLoading && (
                <ProgressBar estimatedMs={estimatedMs} startedAt={requestStart} />
              )}

              <div className="messages-container">
                {activeConversation.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isLoading && (
                  <div className="loading-bubble">
                    {retryInfo
                      ? `Tentando novamente (${retryInfo.attempt}ª tentativa em ${retryInfo.delay}s)...`
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
                isLoading={isLoading}
                isOnline={isOnline}
                onFileExtracted={(text, filename) => setPreview({ content: text, label: `Arquivo: ${filename}` })}
                onOpenTemplates={() => { requestNotifPermission(); setShowTemplates(true); }}
                onOpenContextLibrary={() => setShowContextLibrary(true)}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {preview && (
        <PreviewModal
          initialContent={preview.content}
          sourceLabel={preview.label}
          onConfirm={handlePreviewConfirm}
          onCancel={() => setPreview(null)}
        />
      )}
      {showTemplates && (
        <TemplateManager
          onClose={() => setShowTemplates(false)}
          onSelect={handleTemplateSelect}
        />
      )}
      {showContextLibrary && (
        <ContextLibrary
          onClose={() => setShowContextLibrary(false)}
          onSelect={handleContextSelect}
        />
      )}
      {showTheme && <ThemeSettings onClose={() => setShowTheme(false)} />}
    </div>
  );
}
