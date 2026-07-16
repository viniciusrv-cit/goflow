import { latencyService } from './profileService';

async function rawSend(token, model, messages, { useAdvancedParams = true, temperature = 0.7, maxTokens = 4096, systemPrompt = '' } = {}) {
  const start = Date.now();
  const body = {
    model,
    max_tokens: maxTokens,   // sempre obrigatório
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  };
  if (useAdvancedParams) {
    body.temperature = temperature;
    if (systemPrompt) body.system = systemPrompt;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const duration = Date.now() - start;
  const data = await response.json();
  return { ok: response.ok, status: response.status, data, duration };
}

function parseGatewayError(parsed) {
  const raw = parsed?.error?.message ?? 'Erro desconhecido';
  try {
    const inner = JSON.parse(raw);
    return inner?.history?.[0]?.response?.error?.message ?? raw;
  } catch {
    return raw;
  }
}

export const apiService = {
  async sendMessage(profile, messages, { onRetry } = {}) {
    const { token, model, id: profileId, useAdvancedParams, temperature, maxTokens, systemPrompt } = profile;
    const params = { useAdvancedParams, temperature, maxTokens, systemPrompt };
    const MAX_RETRIES = 2;
    const BACKOFF = [2000, 4000];

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { ok, status, data, duration } = await rawSend(token, model, messages, params);

        if (ok) {
          // Record latency on success
          await latencyService.record(profileId, duration).catch(() => {});
          const text = data.content?.[0]?.text;
          if (!text) throw new Error('Resposta vazia do gateway');
          return text;
        }

        // HTTP 400 = definitivo, não faz retry
        if (status === 400) {
          throw new Error(parseGatewayError(data));
        }

        // HTTP 500 = pode fazer retry
        if (attempt < MAX_RETRIES) {
          onRetry?.(attempt + 1, BACKOFF[attempt]);
          await new Promise(r => setTimeout(r, BACKOFF[attempt]));
          continue;
        }

        throw new Error(parseGatewayError(data));

      } catch (err) {
        // Network/timeout errors: retry
        if (err.name === 'TypeError' || err.name === 'AbortError') {
          if (attempt < MAX_RETRIES) {
            onRetry?.(attempt + 1, BACKOFF[attempt]);
            await new Promise(r => setTimeout(r, BACKOFF[attempt]));
            continue;
          }
          throw new Error('Sem conexão com o gateway. Verifique sua rede.');
        }
        throw err;
      }
    }
  },

  async testConnection(profile) {
    try {
      const response = await fetch('/api/models', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${profile.token}` }
      });
      return { success: response.ok };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
