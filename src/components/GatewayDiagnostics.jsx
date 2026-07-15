import { useState } from 'react';
import { gatewayDiagnostics } from '../services/gatewayDiagnostics';

const TESTS = [
  {
    id: 'latency',
    name: 'T1 — Latência base',
    description: 'Envia uma mensagem mínima e mede o tempo de resposta real do gateway. Revela o formato de resposta de sucesso.',
    run: (profile, onProgress) => gatewayDiagnostics.testLatency(profile, onProgress),
  },
  {
    id: 'error-mapping',
    name: 'T2 — Mapeamento de erros',
    description: 'Envia 3 requests inválidos (token errado, modelo inválido, payload vazio) e captura a estrutura exata dos erros retornados.',
    run: (profile, onProgress) => gatewayDiagnostics.testErrorMapping(profile, onProgress),
  },
  {
    id: 'payload-limit',
    name: 'T3 — Limite de payload',
    description: 'Envia textos de tamanhos crescentes (1KB → 500KB) para descobrir o limite de payload aceito pelo gateway.',
    run: (profile, onProgress) => gatewayDiagnostics.testPayloadLimit(profile, onProgress),
  },
  {
    id: 'session-continuity',
    name: 'T4 — Continuidade de sessão',
    description: 'Envia dois requests independentes para verificar se o gateway mantém contexto entre conversas separadas.',
    run: (profile, onProgress) => gatewayDiagnostics.testSessionContinuity(profile, onProgress),
  },
];

function StatusBadge({ status }) {
  const styles = {
    idle: { background: '#f3f4f6', color: '#6b7280' },
    running: { background: '#dbeafe', color: '#1d4ed8' },
    success: { background: '#dcfce7', color: '#15803d' },
    error: { background: '#fee2e2', color: '#dc2626' },
  };
  const labels = { idle: 'Aguardando', running: 'Executando...', success: 'Concluído', error: 'Erro' };
  const s = styles[status] || styles.idle;
  return (
    <span style={{ ...s, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
      {labels[status]}
    </span>
  );
}

function ResultBlock({ result }) {
  const [expanded, setExpanded] = useState(false);
  if (!result) return null;

  const { id, findings } = result;

  return (
    <div className="diag-result">
      {id === 'latency' && findings && (
        <div className="diag-findings">
          <div className="diag-row">
            <span className="diag-label">Duração</span>
            <span className="diag-value">{findings.duration_ms}ms</span>
          </div>
          <div className="diag-row">
            <span className="diag-label">HTTP Status</span>
            <span className="diag-value">{findings.http_status}</span>
          </div>
          <div className="diag-row">
            <span className="diag-label">Chaves do JSON de resposta</span>
            <span className="diag-value">{findings.response_keys?.join(', ') || '—'}</span>
          </div>
          {findings.content_preview && (
            <div className="diag-row">
              <span className="diag-label">Preview da resposta</span>
              <span className="diag-value diag-preview">{findings.content_preview}</span>
            </div>
          )}
        </div>
      )}

      {id === 'error-mapping' && Array.isArray(findings) && (
        <div className="diag-findings">
          {findings.map((c, i) => (
            <div key={i} className="diag-error-case">
              <div className="diag-case-label">{c.case}</div>
              <div className="diag-row">
                <span className="diag-label">HTTP Status</span>
                <span className="diag-value">{c.http_status ?? 'N/A'}</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">Chaves do erro</span>
                <span className="diag-value">{c.error_keys?.join(', ') || '—'}</span>
              </div>
              <div className="diag-row">
                <span className="diag-label">Duração</span>
                <span className="diag-value">{c.duration_ms}ms</span>
              </div>
              <details className="diag-raw-toggle">
                <summary>Ver JSON bruto</summary>
                <pre className="diag-raw">{c.raw_body || 'vazio'}</pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {id === 'payload-limit' && findings && (
        <div className="diag-findings">
          <div className="diag-conclusion">{findings.limit_conclusion}</div>
          <table className="diag-table">
            <thead>
              <tr><th>Tamanho</th><th>Status</th><th>Resultado</th><th>Tempo</th></tr>
            </thead>
            <tbody>
              {findings.detail.map((r, i) => (
                <tr key={i} className={r.success ? '' : 'diag-row-fail'}>
                  <td>{r.size_kb}KB</td>
                  <td>{r.http_status ?? '—'}</td>
                  <td>{r.success ? 'OK' : 'Falhou'}</td>
                  <td>{r.duration_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {id === 'session-continuity' && findings && (
        <div className="diag-findings">
          <div className={`diag-conclusion ${findings.gateway_remembered_context ? 'diag-warn' : 'diag-ok'}`}>
            {findings.conclusion}
          </div>
          <div className="diag-row">
            <span className="diag-label">Marcador usado</span>
            <span className="diag-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{findings.marker_used}</span>
          </div>
          <div className="diag-error-case">
            <div className="diag-case-label">Request A — Status {findings.request_a.status}</div>
            <pre className="diag-raw">{findings.request_a.response_preview}</pre>
          </div>
          <div className="diag-error-case">
            <div className="diag-case-label">Request B (independente) — Status {findings.request_b.status}</div>
            <pre className="diag-raw">{findings.request_b.response_preview}</pre>
          </div>
        </div>
      )}

      <button
        className="diag-export-btn"
        onClick={() => {
          const json = JSON.stringify(result, null, 2);
          navigator.clipboard?.writeText(json);
        }}
        style={{ marginTop: 8 }}
      >
        Copiar JSON completo
      </button>
    </div>
  );
}

export default function GatewayDiagnostics({ profile, onClose }) {
  const [states, setStates] = useState({});
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState({});
  const [runningAll, setRunningAll] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const setTestState = (id, status, prog, result) => {
    setStates(s => ({ ...s, [id]: status }));
    if (prog !== undefined) setProgress(p => ({ ...p, [id]: prog }));
    if (result !== undefined) setResults(r => ({ ...r, [id]: result }));
  };

  const runTest = async (test) => {
    if (states[test.id] === 'running') return;
    setTestState(test.id, 'running', 'Iniciando...');
    try {
      const result = await test.run(profile, (msg) => setTestState(test.id, 'running', msg, undefined));
      setTestState(test.id, result.ok || result.findings ? 'success' : 'error', null, result);
    } catch (err) {
      setTestState(test.id, 'error', null, { id: test.id, error: err.message });
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const test of TESTS) {
      await runTest(test);
    }
    setRunningAll(false);
  };

  const exportAll = () => {
    const allResults = Object.values(results);
    const json = JSON.stringify({ profile: profile.name, model: profile.model, timestamp: new Date().toISOString(), results: allResults }, null, 2);
    navigator.clipboard?.writeText(json);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2000);
  };

  const completedCount = Object.values(states).filter(s => s === 'success' || s === 'error').length;

  return (
    <div className="diag-container">
      <div className="diag-header">
        <button className="back-btn" onClick={onClose}>← Voltar</button>
        <div>
          <h1>Diagnóstico de Gateway</h1>
          <p className="diag-subtitle">Profile: <strong>{profile.name}</strong> · {profile.model}</p>
        </div>
      </div>

      <div className="diag-body">
        <div className="diag-info">
          Estes testes fazem requests reais ao gateway usando o token do profile selecionado.
          Cada teste consome quota da API. Execute com token válido.
        </div>

        <div className="diag-actions">
          <button
            className="btn btn-primary"
            onClick={runAll}
            disabled={runningAll}
          >
            {runningAll ? 'Executando todos...' : 'Executar todos os testes'}
          </button>
          {completedCount > 0 && (
            <button className="btn btn-secondary" onClick={exportAll}>
              {exportDone ? 'Copiado!' : 'Exportar todos os resultados (JSON)'}
            </button>
          )}
        </div>

        {TESTS.map(test => (
          <div key={test.id} className="diag-card">
            <div className="diag-card-header">
              <div>
                <div className="diag-card-title">{test.name}</div>
                <div className="diag-card-desc">{test.description}</div>
              </div>
              <div className="diag-card-actions">
                <StatusBadge status={states[test.id] || 'idle'} />
                <button
                  className="btn btn-test"
                  onClick={() => runTest(test)}
                  disabled={states[test.id] === 'running' || runningAll}
                  style={{ fontSize: 13, padding: '6px 12px' }}
                >
                  Executar
                </button>
              </div>
            </div>

            {progress[test.id] && states[test.id] === 'running' && (
              <div className="diag-progress">
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginBottom: 0 }} />
                {progress[test.id]}
              </div>
            )}

            <ResultBlock result={results[test.id]} />
          </div>
        ))}

        {/* Manual checklist for Android background test */}
        <div className="diag-card diag-manual">
          <div className="diag-card-header">
            <div>
              <div className="diag-card-title">T5 — Background Android (teste manual)</div>
              <div className="diag-card-desc">Não pode ser automatizado. Executar manualmente no dispositivo Android.</div>
            </div>
            <span style={{ background: '#fef9c3', color: '#a16207', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Manual</span>
          </div>
          <div className="diag-checklist">
            <p className="diag-checklist-title">Passos:</p>
            <ol>
              <li>Envie uma mensagem na conversa normal (aguarde o spinner aparecer)</li>
              <li>Imediatamente troque para outro app (WhatsApp, navegador, etc.)</li>
              <li>Aguarde entre 30s e 2 minutos</li>
              <li>Volte para o GoFlow</li>
            </ol>
            <p className="diag-checklist-title" style={{ marginTop: 12 }}>O que registrar:</p>
            <ul>
              <li>A resposta chegou normalmente ao voltar? → Conexão sobreviveu</li>
              <li>O loading sumiu sem resposta? → Browser matou a requisição</li>
              <li>Apareceu algum erro? → Qual o texto exato do erro?</li>
              <li>Quanto tempo levou a request que você testou?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
