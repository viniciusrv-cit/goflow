import { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import { apiService } from '../services/apiService';
import ModelPicker from './ModelPicker';

function profileToForm(p) {
  return {
    name: p.name ?? '',
    baseUrl: p.baseUrl ?? 'https://flow.ciandt.com/flow-llm-proxy',
    token: p.token ?? '',
    model: p.model ?? 'anthropic.claude-4-6-sonnet',
    useAdvancedParams: p.useAdvancedParams ?? true,
    temperature: p.temperature ?? 0.7,
    maxTokens: p.maxTokens ?? 4096,
    systemPrompt: p.systemPrompt ?? ''
  };
}

export default function Settings({
  profile, profiles, onClose, onProfileUpdated, onProfileDeleted, onOpenDiagnostics
}) {
  const [selectedProfile, setSelectedProfile] = useState(profile);
  const [formData, setFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (selectedProfile) setFormData(profileToForm(selectedProfile));
  }, [selectedProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (!formData.name.trim()) throw new Error('Nome é obrigatório');
      if (!formData.token.trim()) throw new Error('Token é obrigatório');
      await profileService.updateProfile(selectedProfile.id, {
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        token: formData.token.trim(),
        model: formData.model,
        useAdvancedParams: formData.useAdvancedParams,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        systemPrompt: formData.systemPrompt
      });
      setSuccess('Profile atualizado com sucesso');
      setIsEditing(false);
      await onProfileUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setTestingConnection(true);
    try {
      const result = await apiService.testConnection({
        baseUrl: formData.baseUrl,
        token: formData.token,
        model: formData.model
      });
      setTestResult({ success: result.success, message: result.success ? 'Conexão OK ✓' : `Erro: ${result.error}` });
    } catch (err) {
      setTestResult({ success: false, message: `Erro: ${err.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza? Todas as conversas deste profile serão deletadas.')) return;
    setIsLoading(true);
    try {
      await profileService.deleteProfile(selectedProfile.id);
      await onProfileDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!formData) return null;

  const disabled = !isEditing || isLoading;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={onClose}>← Voltar</button>
        <h1>Configurações</h1>
      </div>

      <div className="settings-body">
        <div className="settings-section">
          <h2>Ferramentas de desenvolvedor</h2>
          <button type="button" className="btn btn-diag" onClick={onOpenDiagnostics}>
            Diagnóstico de Gateway
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
            Testa latência, erros, limite de payload e continuidade de sessão do gateway.
          </p>
        </div>

        <div className="settings-section">
          <h2>Profiles</h2>
          <div className="profile-tabs">
            {profiles.map(p => (
              <button key={p.id}
                className={`profile-tab ${selectedProfile.id === p.id ? 'active' : ''}`}
                onClick={() => { setSelectedProfile(p); setIsEditing(false); setError(''); setSuccess(''); }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {selectedProfile && (
          <form onSubmit={handleSave} className="settings-form">

            <div className="settings-section">
              <h2>Conexão</h2>

              <div className="form-group">
                <label>Nome</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={disabled} />
              </div>

              <div className="form-group">
                <label>URL do Gateway</label>
                <input type="url" name="baseUrl" value={formData.baseUrl} onChange={handleChange} disabled={disabled} />
              </div>

              <div className="form-group">
                <label>Token JWT</label>
                <textarea name="token" value={formData.token} onChange={handleChange} disabled={disabled} rows="3" />
              </div>

              <div className="form-group">
                <label>Modelo</label>
                <ModelPicker
                  token={formData.token}
                  value={formData.model}
                  onChange={v => setFormData(prev => ({ ...prev, model: v }))}
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="settings-section">
              <h2>Parâmetros do modelo</h2>

              <div className="form-group">
                <label className="toggle-label">
                  <input type="checkbox" name="useAdvancedParams" checked={formData.useAdvancedParams}
                    onChange={handleChange} disabled={disabled} />
                  Enviar parâmetros opcionais (temperature, system prompt)
                </label>
                <div className="param-hint">Desative para modelos que não suportam estes parâmetros</div>
              </div>

              {formData.useAdvancedParams && (
                <>
                  <div className="form-group">
                    <label>
                      Temperature <span className="param-value">{formData.temperature}</span>
                    </label>
                    <input type="range" name="temperature" min="0" max="1" step="0.05"
                      value={formData.temperature} onChange={handleChange} disabled={disabled} />
                    <div className="param-range-labels">
                      <span>Preciso / determinístico (0)</span>
                      <span>Criativo / variado (1)</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Max Tokens</label>
                    <input type="number" name="maxTokens" min="256" max="32768" step="256"
                      value={formData.maxTokens} onChange={handleChange} disabled={disabled} />
                    <div className="param-hint">Limite de tokens na resposta do modelo</div>
                  </div>

                  <div className="form-group">
                    <label>System Prompt <span className="param-optional">(opcional)</span></label>
                    <textarea name="systemPrompt" value={formData.systemPrompt} onChange={handleChange}
                      placeholder="Instrução fixa enviada em todo request (persona, idioma, restrições...)"
                      rows="4" disabled={disabled} />
                  </div>
                </>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}

            <div className="form-actions">
              {!isEditing ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-test" onClick={handleTestConnection} disabled={testingConnection}>
                    {testingConnection ? 'Testando...' : 'Testar Conexão'}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isLoading}>
                    Deletar Profile
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-secondary" disabled={isLoading}
                    onClick={() => { setIsEditing(false); setFormData(profileToForm(selectedProfile)); }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
