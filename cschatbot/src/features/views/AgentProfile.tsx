// src/pages/AgentProfile.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { compilePersonaFromText } from '@/features/chatbot/ai/personaCompiler';
import { savePersonaToLocalStorage, getPersonaFromLocalStorage } from '@/features/chatbot/ai/personaLoader';
import './AgentProfile.css'; // 👈 기존 CSS 유지

type StoredProfile = { 
  name: string; 
  role: string; 
  profileImage: string | null;
  greeting: string; // 👈 첫 인사말 추가
};

const PROFILE_LS = 'agentProfile';

const AgentProfile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [greeting, setGreeting] = useState(''); // 👈 첫 인사말 상태
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_LS);
      if (raw) {
        const p: StoredProfile = JSON.parse(raw);
        setName(p.name || '');
        setRole(p.role || '');
        setProfileImage(p.profileImage ?? null);
        setGreeting(p.greeting || ''); // 👈 로드
      }
    } catch {}

    const persona = getPersonaFromLocalStorage();
    if (persona) {
      setName(persona.displayName || '');
      setRole(persona.role || '');
      if (persona.greeting) setGreeting(persona.greeting); // 👈 persona greeting
    }
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = () => {
    const agentData: StoredProfile = { name, role, profileImage, greeting };
    localStorage.setItem(PROFILE_LS, JSON.stringify(agentData));

    const persona = compilePersonaFromText(name, role, greeting); // 👈 greeting 포함
    savePersonaToLocalStorage(persona);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const handleReset = () => {
    localStorage.removeItem(PROFILE_LS);
    localStorage.removeItem('agentPersona:v1');
    setName('');
    setRole('');
    setProfileImage(null);
    setGreeting(''); // 👈 초기화
  };

  return (
    <div className="agent-card">
      <h2>Agent Profile Settings</h2>

      <div className="image-upload">
        <label className="image-wrapper">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="profile-image" />
          ) : (
            <div className="profile-placeholder">+</div>
          )}
          <input type="file" accept="image/*" onChange={handleImageChange} hidden />
        </label>
      </div>

      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          placeholder="Enter agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Role Description</label>
        <textarea
          placeholder="Describe the agent's role in natural language"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Chatbot Greeting</label> {/* 👈 새 필드 */}
        <textarea
          placeholder="Enter chatbot's first greeting message"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
        />
      </div>

      <div className="button-group">
        <button className="save-button" onClick={handleSave}>Save</button>
        <button className="reset-button" onClick={handleReset}>Reset</button>
      </div>

      {isSaved && <p className="save-message">Changes have been saved.</p>}
    </div>
  );
};

export default AgentProfile;