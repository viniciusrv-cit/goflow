import { useState } from 'react';

export default function ModelPicker({ token, value, onChange, disabled }) {
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchModels = async () => {
    if (!token?.trim()) {
      setError('Insira o token antes de buscar os modelos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/models', {
        headers: { Authorization: `Bearer ${token.trim()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Erro ao buscar modelos');
      const list = data?.data ?? [];
      if (list.length === 0) throw new Error('Nenhum modelo retornado');
      setModels(list.map(m => m.id));
      if (!value || !list.find(m => m.id === value)) {
        onChange(list[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="model-picker">
      <div className="model-picker-row">
        {models ? (
          <select
            className="model-select"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
          >
            {models.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className="model-input"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="ex: anthropic.claude-4-6-sonnet"
            disabled={disabled}
          />
        )}
        <button
          type="button"
          className="btn-fetch-models"
          onClick={fetchModels}
          disabled={loading || disabled}
          title="Buscar modelos disponíveis no gateway"
        >
          {loading ? '…' : '⟳ Buscar'}
        </button>
      </div>
      {error && <div className="model-picker-error">{error}</div>}
      {models && (
        <button
          type="button"
          className="model-picker-reset"
          onClick={() => setModels(null)}
        >
          Digitar manualmente
        </button>
      )}
    </div>
  );
}
