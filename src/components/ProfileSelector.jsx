import { useState } from 'react';
import { profileService } from '../services/profileService';
import ModelPicker from './ModelPicker';

const DEFAULTS = {
  name: '',
  baseUrl: 'https://flow.ciandt.com/flow-llm-proxy',
  token: '',
  model: 'anthropic.claude-4-6-sonnet',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: ''
};

export default function ProfileSelector({ profiles, onSelectProfile, onCreateProfile }) {
  const [showForm, setShowForm] = useState(profiles.length === 0);
  const [formData, setFormData] = useState(DEFAULTS);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (!formData.name.trim()) throw new Error('Nome do profile é obrigatório');
      if (!formData.token.trim()) throw new Error('Token é obrigatório');
      await profileService.createProfile({
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        token: formData.token.trim(),
        model: formData.model,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        systemPrompt: formData.systemPrompt
      });
      setFormData(DEFAULTS);
      setShowForm(false);
      await onCreateProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-selector-container">
      <div className="profile-selector-header">
        <h1>GoFlow</h1>
        <p>Selecione um profile para continuar</p>
      </div>

      {profiles.length > 0 && !showForm && (
        <div className="profile-list">
          {profiles.map(profile => (
            <button key={profile.id} className="profile-card" onClick={() => onSelectProfile(profile)}>
              <div className="profile-card-name">{profile.name}</div>
              <div className="profile-card-model">{profile.model}</div>
            </button>
          ))}
          <button className="profile-card profile-card-new" onClick={() => setShowForm(true)}>
            <span className="icon">+</span>
            <span>Novo profile</span>
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Nome do Profile</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              placeholder="ex: Dev, Produção" disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label>URL do Gateway</label>
            <input type="url" name="baseUrl" value={formData.baseUrl} onChange={handleChange}
              disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label>Token JWT</label>
            <textarea name="token" value={formData.token} onChange={handleChange}
              placeholder="Cole seu token JWT aqui" rows="3" disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label>Modelo</label>
            <ModelPicker
              token={formData.token}
              value={formData.model}
              onChange={v => setFormData(prev => ({ ...prev, model: v }))}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Temperature <span className="param-value">{formData.temperature}</span></label>
            <input type="range" name="temperature" min="0" max="1" step="0.05"
              value={formData.temperature} onChange={handleChange} disabled={isSubmitting} />
            <div className="param-range-labels"><span>Preciso (0)</span><span>Criativo (1)</span></div>
          </div>

          <div className="form-group">
            <label>Max Tokens</label>
            <input type="number" name="maxTokens" min="256" max="32768" step="256"
              value={formData.maxTokens} onChange={handleChange} disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label>System Prompt <span className="param-optional">(opcional)</span></label>
            <textarea name="systemPrompt" value={formData.systemPrompt} onChange={handleChange}
              placeholder="Instrução fixa enviada em todo request (persona, idioma, restrições...)"
              rows="3" disabled={isSubmitting} />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            {profiles.length > 0 && (
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                className="btn btn-secondary" disabled={isSubmitting}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
