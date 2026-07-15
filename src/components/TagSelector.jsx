import { useState, useEffect } from 'react';
import { tagService } from '../services/profileService';

export default function TagSelector({ selectedTags = [], onChange, onClose }) {
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => { tagService.getAll().then(setTags); }, []);

  const toggle = (id) => {
    const next = selectedTags.includes(id)
      ? selectedTags.filter(t => t !== id)
      : [...selectedTags, id];
    onChange(next);
  };

  const createTag = async () => {
    if (!newTag.trim()) return;
    const tag = await tagService.create(newTag.trim());
    const updated = await tagService.getAll();
    setTags(updated);
    onChange([...selectedTags, tag.id]);
    setNewTag('');
  };

  return (
    <div className="tag-selector">
      <div className="tag-selector-header">
        <span>Tags</span>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="tag-list">
        {tags.map(tag => (
          <button
            key={tag.id}
            className={`tag-chip ${selectedTags.includes(tag.id) ? 'active' : ''}`}
            onClick={() => toggle(tag.id)}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="tag-new">
        <input
          placeholder="Nova tag..."
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createTag()}
        />
        <button className="btn btn-secondary" onClick={createTag} disabled={!newTag.trim()}>
          Criar
        </button>
      </div>
    </div>
  );
}
