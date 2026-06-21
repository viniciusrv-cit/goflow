export default function ProfileIndicator({ profile }) {
  return (
    <div className="profile-indicator">
      <div className="profile-indicator-name">{profile.name}</div>
      <div className="profile-indicator-model">{profile.model}</div>
    </div>
  );
}
