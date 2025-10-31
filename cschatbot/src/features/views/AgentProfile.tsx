// src/pages/AgentProfile.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { compilePersonaFromText } from '@/features/chatbot/ai/personaCompiler';
import { savePersonaToLocalStorage, getPersonaFromLocalStorage } from '@/features/chatbot/ai/personaLoader';
import './AgentProfile.css'; // 👈 추가

type StoredProfile = { name: string; role: string; profileImage: string | null };

const PROFILE_LS = 'agentProfile';

const AgentProfile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_LS);
      if (raw) {
        const p: StoredProfile = JSON.parse(raw);
        setName(p.name || '');
        setRole(p.role || '');
        setProfileImage(p.profileImage ?? null);
      }
    } catch {}
    const persona = getPersonaFromLocalStorage();
    if (persona) {
      setName(persona.displayName || '');
      setRole(persona.role || '');
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
    const agentData: StoredProfile = { name, role, profileImage };
    localStorage.setItem(PROFILE_LS, JSON.stringify(agentData));

    const persona = compilePersonaFromText(name, role);
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
  };

  return (
    <div className="agent-card">
      <h2>에이전트 프로필 설정</h2>

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
        <label>이름</label>
        <input
          type="text"
          placeholder="에이전트 이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>역할 설명</label>
        <textarea
          placeholder="에이전트의 역할을 자연어로 설명하세요"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      <div className="button-group">
        <button className="save-button" onClick={handleSave}>저장하기</button>
        <button className="reset-button" onClick={handleReset}>초기화</button>
      </div>

      {isSaved && <p className="save-message"> 변경사항이 저장되었습니다.</p>}
    </div>
  );
};

export default AgentProfile;