async function rawRequest(token, body) {
  const start = Date.now();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - start;
    const rawText = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch (_) {}

    return { ok: response.ok, status: response.status, duration, rawText, parsed, error: null };
  } catch (err) {
    return { ok: false, status: null, duration: Date.now() - start, rawText: null, parsed: null, error: err.message };
  }
}

function generateText(sizeKB) {
  const word = 'diagnostico ';
  const targetChars = sizeKB * 1024;
  let text = '';
  while (text.length < targetChars) text += word;
  return text.slice(0, targetChars);
}

export const gatewayDiagnostics = {

  // T1: Measure baseline latency with a minimal valid request
  async testLatency(profile, onProgress) {
    onProgress('Enviando mensagem mínima...');
    const result = await rawRequest(profile.token, {
      model: profile.model,
      max_tokens: 64,
      messages: [{ role: 'user', content: 'Olá' }],
    });

    const responseShape = result.parsed ? Object.keys(result.parsed) : null;
    const contentText = result.parsed?.content?.[0]?.text || null;

    return {
      id: 'latency',
      name: 'T1 — Latência base',
      ...result,
      findings: {
        duration_ms: result.duration,
        http_status: result.status,
        response_keys: responseShape,
        content_preview: contentText ? contentText.slice(0, 120) : null,
        success: result.ok,
      },
    };
  },

  // T2: Send deliberately broken requests to map the error structure
  async testErrorMapping(profile, onProgress) {
    const cases = [
      {
        label: 'Token inválido',
        token: profile.token + '_INVALID_TOKEN',
        body: { model: profile.model, max_tokens: 64, messages: [{ role: 'user', content: 'teste' }] },
      },
      {
        label: 'Modelo inválido',
        token: profile.token,
        body: { model: 'modelo-invalido-xyz-999', max_tokens: 64, messages: [{ role: 'user', content: 'teste' }] },
      },
      {
        label: 'Mensagens vazias (array vazio)',
        token: profile.token,
        body: { model: profile.model, max_tokens: 64, messages: [] },
      },
    ];

    const results = [];
    for (const c of cases) {
      onProgress(`Testando: ${c.label}...`);
      const r = await rawRequest(c.token, c.body);
      results.push({
        case: c.label,
        http_status: r.status,
        raw_body: r.rawText,
        parsed: r.parsed,
        error_keys: r.parsed ? Object.keys(r.parsed) : null,
        duration_ms: r.duration,
      });
    }

    return {
      id: 'error-mapping',
      name: 'T2 — Mapeamento de erros',
      findings: results,
      ok: true,
    };
  },

  // T3: Send progressively larger payloads to find the size limit
  async testPayloadLimit(profile, onProgress) {
    const sizes = [1, 5, 10, 50, 100, 500];
    const results = [];

    for (const sizeKB of sizes) {
      onProgress(`Testando payload de ${sizeKB}KB...`);
      const text = generateText(sizeKB);
      const r = await rawRequest(profile.token, {
        model: profile.model,
        max_tokens: 32,
        messages: [{ role: 'user', content: text }],
      });
      results.push({
        size_kb: sizeKB,
        actual_chars: text.length,
        http_status: r.status,
        success: r.ok,
        duration_ms: r.duration,
        error: r.parsed?.error || r.error || null,
      });

      // Stop after two consecutive failures to avoid wasting quota
      const lastTwo = results.slice(-2);
      if (lastTwo.length === 2 && lastTwo.every(x => !x.success)) break;
    }

    const lastSuccess = [...results].reverse().find(r => r.success);
    const firstFail = results.find(r => !r.success);

    return {
      id: 'payload-limit',
      name: 'T3 — Limite de payload',
      ok: true,
      findings: {
        last_success_kb: lastSuccess?.size_kb ?? null,
        first_failure_kb: firstFail?.size_kb ?? null,
        limit_conclusion: firstFail
          ? `Falhou em ${firstFail.size_kb}KB. Limite está entre ${lastSuccess?.size_kb ?? 0}KB e ${firstFail.size_kb}KB.`
          : `Todos os tamanhos testados (até ${sizes[sizes.length - 1]}KB) passaram.`,
        detail: results,
      },
    };
  },

  // T4: Check if the gateway maintains session context across separate requests
  async testSessionContinuity(profile, onProgress) {
    const MARKER = 'GOFLOW_SESSAO_TESTE_XK7';

    onProgress('Enviando mensagem A com marcador único...');
    const reqA = await rawRequest(profile.token, {
      model: profile.model,
      max_tokens: 64,
      messages: [{ role: 'user', content: `Para este teste, responda APENAS com este texto exato: ${MARKER}` }],
    });

    const responseA = reqA.parsed?.content?.[0]?.text || reqA.rawText || '';

    onProgress('Enviando mensagem B independente (sem histórico)...');
    const reqB = await rawRequest(profile.token, {
      model: profile.model,
      max_tokens: 128,
      messages: [{ role: 'user', content: 'O que eu disse na minha mensagem anterior a esta?' }],
    });

    const responseB = reqB.parsed?.content?.[0]?.text || reqB.rawText || '';
    const gatewayRemembered = responseB.includes(MARKER);

    return {
      id: 'session-continuity',
      name: 'T4 — Continuidade de sessão',
      ok: reqA.ok && reqB.ok,
      findings: {
        marker_used: MARKER,
        request_a: { status: reqA.status, response_preview: responseA.slice(0, 200) },
        request_b: { status: reqB.status, response_preview: responseB.slice(0, 200) },
        gateway_remembered_context: gatewayRemembered,
        conclusion: gatewayRemembered
          ? 'ATENÇÃO: O gateway parece manter contexto entre requests independentes. Investigar.'
          : 'Confirmado: o gateway NÃO mantém contexto entre requests separados. Comportamento stateless esperado.',
      },
    };
  },
};
