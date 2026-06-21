import { openDB } from 'idb';

const DB_NAME = 'claude-pwa-db';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
};

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

export const chatService = {
  async createConversation(profileId, title = 'Nova conversa') {
    const db = await getDB();
    const id = `conv_${Date.now()}`;
    const conversation = {
      id,
      profileId,
      title,
      messages: [],
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

  async getConversationsByProfile(profileId) {
    const db = await getDB();
    const all = await db.getAll('conversations');
    return all
      .filter(c => c.profileId === profileId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async addMessage(conversationId, role, content) {
    const db = await getDB();
    const conversation = await db.get('conversations', conversationId);
    if (!conversation) throw new Error('Conversation not found');
    const message = {
      id: `msg_${Date.now()}`,
      role,
      content,
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
    conversation.title = title;
    conversation.updatedAt = new Date().toISOString();
    await db.put('conversations', conversation);
    return conversation;
  },

  async deleteConversation(id) {
    const db = await getDB();
    await db.delete('conversations', id);
  },

  async deleteConversationsByProfile(profileId) {
    const conversations = await this.getConversationsByProfile(profileId);
    const db = await getDB();
    for (const conv of conversations) {
      await db.delete('conversations', conv.id);
    }
  }
};
