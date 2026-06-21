import { useState } from 'react';
import { profileService } from '../services/profileService';

export default function ProfileSelector({ profiles, onSelectProfile, onCreateProfile }) {
  const [showForm, setShowForm] = useState(profiles.length === 0);
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: 'https://flow.ciandt.com/flow-llm-proxy',
    token: '',
    model: 'anthropic.claude-4-6-sonnet'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Nome do profile é obrigatório');
      }
      if (!formData.token.trim()) {
        throw new Error('Token é obrigatório');
      }

      await profileService.createProfile({
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        token: formData.token.trim(),
        model: formData.model
      });

      setFormData({
        name: '',
        baseUrl: 'https://flow.ciandt.com/flow-llm-proxy',
        token: '',
        model: 'anthropic.claude-4-6-sonnet'
      });
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
        <h1>Claude Gateway</h1>
        <p>Selecione um profile para continuar</p>
      </div>

      {profiles.length > 0 && !showForm && (
        <div className="profile-list">
          {profiles.map(profile => (
            <button
              key={profile.id}
              className="profile-card"
              onClick={() => onSelectProfile(profile)}
            >
              <div className="profile-card-name">{profile.name}</div>
              <div className="profile-card-model">{profile.model}</div>
            </button>
          ))}
          
          <button
            className="profile-card profile-card-new"
            onClick={() => setShowForm(true)}
          >
            <span className="icon">+</span>
            <span>Novo profile</span>
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Nome do Profile</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="ex: Dev, Produção"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>URL do Gateway</label>
            <input
              type="url"
              name="baseUrl"
              value={formData.baseUrl}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Token JWT</label>
            <textarea
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              placeholder="Cole seu token JWT aqui"
              rows="4"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>Modelo</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError('');
              }}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
