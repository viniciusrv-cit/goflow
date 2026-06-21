export const apiService = {
  async sendMessage(profile, messages) {
    const { token, model } = profile;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }

      throw new Error('Empty response from API');
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  },

  async testConnection(profile) {
    const { token } = profile;

    try {
      const response = await fetch('/api/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
};
