import { openDB } from 'idb';

const DB_NAME = 'goflow-db';
const DB_VERSION = 2;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stores
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        // v2 stores
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('contextLibrary')) {
          db.createObjectStore('contextLibrary', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('latencyHistory')) {
          db.createObjectStore('latencyHistory', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pendingRequests')) {
          db.createObjectStore('pendingRequests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
};

// ── Profile Service ────────────────────────────────────────────
export const profileService = {
  async createProfile(profile) {
    const db = await getDB();
    const id = `profile_${Date.now()}`;
    const newProfile = { ...profile, id, createdAt: new Date().toISOString() };
    await db.add('profiles', newProfile);
    return newProfile;
  },
  async getProfile(id) {
    const db = await getDB();
    return db.get('profiles', id);
  },
  async getAllProfiles() {
    const db = await getDB();
    return db.getAll('profiles');
  },
  async updateProfile(id, updates) {
    const db = await getDB();
    const profile = await db.get('profiles', id);
    if (!profile) throw new Error('Profile not found');
    const updated = { ...profile, ...updates, id };
    await db.put('profiles', updated);
    return updated;
  },
  async deleteProfile(id) {
    await chatService.deleteConversationsByProfile(id);
    const db = await getDB();
    await db.delete('profiles', id);
  }
};

// ── Chat Service ───────────────────────────────────────────────
export const chatService = {
  async createConversation(profileId, title = 'Nova conversa') {
    const db = await getDB();
    const id = `conv_${Date.now()}`;
    const conversation = {
      id, profileId, title,
      messages: [],
      pinned: false,
      archived: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.add('conversations', conversation);
    return conversation;
  },
  async getConversation(id) {
    const db = await getDB();
    return db.get('conversations', id);
  },
  async getConversationsByProfile(profileId, includeArchived = false) {
    const db = await getDB();
    const all = await db.getAll('conversations');
    return all
      .filter(c => c.profileId === profileId && (includeArchived || !c.archived))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
  },
  async addMessage(conversationId, role, content) {
    const db = await getDB();
    const conversation = await db.get('conversations', conversationId);
    if (!conversation) throw new Error('Conversation not found');
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role, content,
      timestamp: new Date().toISOString()
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    await db.put('conversations', conversation);
    return message;
  },
  async updateConversationTitle(conversationId, title) {
    const db = await getDB();
    const conversation = await db.get('conversations', conversationId);
    if (!conversation) throw new Error('Conversation not found');
    conversation.title = title || conversation.messages[0]?.content?.slice(0, 50) || 'Nova conversa';
    conversation.updatedAt = new Date().toISOString();
    await db.put('conversations', conversation);
    return conversation;
  },
  async togglePin(conversationId) {
    const db = await getDB();
    const conv = await db.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found');
    conv.pinned = !conv.pinned;
    await db.put('conversations', conv);
    return conv;
  },
  async toggleArchive(conversationId) {
    const db = await getDB();
    const conv = await db.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found');
    conv.archived = !conv.archived;
    conv.pinned = false;
    await db.put('conversations', conv);
    return conv;
  },
  async duplicateConversation(conversationId) {
    const db = await getDB();
    const original = await db.get('conversations', conversationId);
    if (!original) throw new Error('Conversation not found');
    const id = `conv_${Date.now()}`;
    const duplicate = {
      ...original,
      id,
      title: `${original.title} (cópia)`,
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: original.messages.map(m => ({ ...m, id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }))
    };
    await db.add('conversations', duplicate);
    return duplicate;
  },
  async setTags(conversationId, tags) {
    const db = await getDB();
    const conv = await db.get('conversations', conversationId);
    if (!conv) throw new Error('Conversation not found');
    conv.tags = tags;
    await db.put('conversations', conv);
    return conv;
  },
  async deleteConversation(id) {
    const db = await getDB();
    await db.delete('conversations', id);
  },
  async deleteConversationsByProfile(profileId) {
    const conversations = await this.getConversationsByProfile(profileId, true);
    const db = await getDB();
    for (const conv of conversations) {
      await db.delete('conversations', conv.id);
    }
  },
  exportAsMarkdown(conversation) {
    const lines = [`# ${conversation.title}`, `Data: ${new Date(conversation.createdAt).toLocaleString('pt-BR')}`, '---', ''];
    for (const msg of conversation.messages) {
      const who = msg.role === 'user' ? 'Você' : 'Assistente';
      const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
      lines.push(`**${who}** _(${time})_`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    return lines.join('\n');
  }
};

// ── Template Service ───────────────────────────────────────────
export const templateService = {
  async create(name, content) {
    const db = await getDB();
    const id = `tpl_${Date.now()}`;
    const template = { id, name, content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await db.add('templates', template);
    return template;
  },
  async getAll() {
    const db = await getDB();
    const all = await db.getAll('templates');
    return all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },
  async update(id, updates) {
    const db = await getDB();
    const tpl = await db.get('templates', id);
    if (!tpl) throw new Error('Template not found');
    const updated = { ...tpl, ...updates, id, updatedAt: new Date().toISOString() };
    await db.put('templates', updated);
    return updated;
  },
  async delete(id) {
    const db = await getDB();
    await db.delete('templates', id);
  }
};

// ── Context Library Service ────────────────────────────────────
export const contextLibraryService = {
  async create(name, content) {
    const db = await getDB();
    const id = `ctx_${Date.now()}`;
    const now = new Date().toISOString();
    const entry = {
      id, name,
      versions: [{ content, createdAt: now }],
      createdAt: now,
      updatedAt: now
    };
    await db.add('contextLibrary', entry);
    return entry;
  },
  async getAll() {
    const db = await getDB();
    const all = await db.getAll('contextLibrary');
    return all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },
  async addVersion(id, content) {
    const db = await getDB();
    const entry = await db.get('contextLibrary', id);
    if (!entry) throw new Error('Context not found');
    entry.versions.push({ content, createdAt: new Date().toISOString() });
    entry.updatedAt = new Date().toISOString();
    await db.put('contextLibrary', entry);
    return entry;
  },
  async revertToVersion(id, versionIndex) {
    const db = await getDB();
    const entry = await db.get('contextLibrary', id);
    if (!entry) throw new Error('Context not found');
    const version = entry.versions[versionIndex];
    if (!version) throw new Error('Version not found');
    entry.versions.push({ content: version.content, createdAt: new Date().toISOString() });
    entry.updatedAt = new Date().toISOString();
    await db.put('contextLibrary', entry);
    return entry;
  },
  async delete(id) {
    const db = await getDB();
    await db.delete('contextLibrary', id);
  },
  getCurrentContent(entry) {
    return entry.versions[entry.versions.length - 1]?.content ?? '';
  }
};

// ── Latency History Service ────────────────────────────────────
export const latencyService = {
  async record(profileId, durationMs) {
    const db = await getDB();
    const id = `lat_${Date.now()}`;
    await db.add('latencyHistory', { id, profileId, durationMs, recordedAt: new Date().toISOString() });
    // Keep only last 20 per profile
    const all = await db.getAll('latencyHistory');
    const profileRecords = all
      .filter(r => r.profileId === profileId)
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));
    if (profileRecords.length > 20) {
      for (const old of profileRecords.slice(20)) {
        await db.delete('latencyHistory', old.id);
      }
    }
  },
  async getAverage(profileId) {
    const db = await getDB();
    const all = await db.getAll('latencyHistory');
    const records = all.filter(r => r.profileId === profileId);
    if (records.length === 0) return null;
    const recent = records
      .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
      .slice(0, 10);
    return Math.round(recent.reduce((sum, r) => sum + r.durationMs, 0) / recent.length);
  }
};

// ── Pending Request Service ────────────────────────────────────
export const pendingRequestService = {
  async save(conversationId, messageContent) {
    const db = await getDB();
    await db.put('pendingRequests', {
      id: conversationId,
      messageContent,
      startedAt: new Date().toISOString()
    });
  },
  async get(conversationId) {
    const db = await getDB();
    return db.get('pendingRequests', conversationId);
  },
  async clear(conversationId) {
    const db = await getDB();
    await db.delete('pendingRequests', conversationId);
  }
};

// ── Tag Service ────────────────────────────────────────────────
export const tagService = {
  async getAll() {
    const db = await getDB();
    return db.getAll('tags');
  },
  async create(name) {
    const db = await getDB();
    const id = `tag_${Date.now()}`;
    const tag = { id, name, createdAt: new Date().toISOString() };
    await db.add('tags', tag);
    return tag;
  },
  async delete(id) {
    const db = await getDB();
    await db.delete('tags', id);
  }
};

// ── Settings Service ───────────────────────────────────────────
export const settingsService = {
  async get(key, defaultValue) {
    const db = await getDB();
    const entry = await db.get('settings', key);
    return entry?.value ?? defaultValue;
  },
  async set(key, value) {
    const db = await getDB();
    await db.put('settings', { key, value });
  }
};
