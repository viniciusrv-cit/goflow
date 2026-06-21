export default function Menu({ onSettingsClick, onChangeProfile, onClose }) {
  return (
    <div className="menu-dropdown" onClick={onClose}>
      <button className="menu-item" onClick={onSettingsClick}>
        ⚙️ Settings
      </button>
      <button className="menu-item" onClick={onChangeProfile}>
        🔄 Trocar Profile
      </button>
    </div>
  );
}
