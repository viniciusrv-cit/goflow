import { useState, useEffect } from 'react';
import { profileService } from './services/profileService';
import ProfileSelector from './components/ProfileSelector';
import ChatWindow from './components/ChatWindow';
import Settings from './components/Settings';
import GatewayDiagnostics from './components/GatewayDiagnostics';
import './App.css';

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const allProfiles = await profileService.getAllProfiles();
        setProfiles(allProfiles);
        
        if (allProfiles.length === 0) {
          setShowProfileSelector(true);
        } else {
          const lastUsed = localStorage.getItem('lastUsedProfile');
          const profile = allProfiles.find(p => p.id === lastUsed) || allProfiles[0];
          setActiveProfile(profile);
          localStorage.setItem('lastUsedProfile', profile.id);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleProfileCreated = async () => {
    const allProfiles = await profileService.getAllProfiles();
    setProfiles(allProfiles);
    setShowProfileSelector(false);
  };

  const handleProfileUpdated = async () => {
    const allProfiles = await profileService.getAllProfiles();
    setProfiles(allProfiles);
    if (activeProfile) {
      const updated = allProfiles.find(p => p.id === activeProfile.id);
      if (updated) {
        setActiveProfile(updated);
      }
    }
  };

  const handleProfileDeleted = async () => {
    const allProfiles = await profileService.getAllProfiles();
    setProfiles(allProfiles);
    
    if (allProfiles.length === 0) {
      setActiveProfile(null);
      setShowProfileSelector(true);
    } else {
      const newActive = allProfiles[0];
      setActiveProfile(newActive);
      localStorage.setItem('lastUsedProfile', newActive.id);
    }
  };

  const handleSelectProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('lastUsedProfile', profile.id);
    setShowProfileSelector(false);
  };

  if (loading) {
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  if (showDiagnostics && activeProfile) {
    return (
      <GatewayDiagnostics
        profile={activeProfile}
        onClose={() => setShowDiagnostics(false)}
      />
    );
  }

  if (showSettings) {
    return (
      <Settings 
        profile={activeProfile}
        profiles={profiles}
        onClose={() => setShowSettings(false)}
        onProfileUpdated={handleProfileUpdated}
        onProfileDeleted={handleProfileDeleted}
        onOpenDiagnostics={() => { setShowSettings(false); setShowDiagnostics(true); }}
      />
    );
  }

  if (showProfileSelector) {
    return (
      <ProfileSelector 
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleProfileCreated}
      />
    );
  }

  if (!activeProfile) {
    return (
      <div className="app-container">
        <div className="empty-state">
          <p>Nenhum profile disponível</p>
          <button onClick={() => setShowProfileSelector(true)} className="btn btn-primary">
            Criar profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatWindow 
      profile={activeProfile}
      onSettingsClick={() => setShowSettings(true)}
      onChangeProfile={() => setShowProfileSelector(true)}
      onOpenDiagnostics={() => setShowDiagnostics(true)}
      profiles={profiles}
    />
  );
}
