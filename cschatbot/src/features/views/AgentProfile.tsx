// src/pages/AgentProfile.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { compilePersonaFromText } from '@/features/chatbot/ai/personaCompiler';
import { savePersonaToLocalStorage, getPersonaFromLocalStorage } from '@/features/chatbot/ai/personaLoader';

type StoredProfile = { name: string; role: string; profileImage: string | null };

const PROFILE_LS = 'agentProfile';

const AgentProfile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // 프로필(이미지 포함)
    try {
      const raw = localStorage.getItem(PROFILE_LS);
      if (raw) {
        const p: StoredProfile = JSON.parse(raw);
        setName(p.name || '');
        setRole(p.role || '');
        setProfileImage(p.profileImage ?? null);
      }
    } catch {}
    // 페르소나(있으면 UI에 반영)
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
    // 1) 프로필 저장
    const agentData: StoredProfile = { name, role, profileImage };
    localStorage.setItem(PROFILE_LS, JSON.stringify(agentData));

    // 2) 역할 텍스트를 Persona로 컴파일 후 저장
    const persona = compilePersonaFromText(name, role);
    savePersonaToLocalStorage(persona);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1500);
  };

  const handleReset = () => {
    localStorage.removeItem(PROFILE_LS);
    // 페르소나도 초기화
    localStorage.removeItem('agentPersona:v1');
    setName('');
    setRole('');
    setProfileImage(null);
  };

  return (
    <div className="centered-view">
      <h2>에이전트 프로필 설정</h2>

      <div className="profile-image-container">
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="profile-image" />
        ) : (
          <div className="profile-placeholder">프로필 사진</div>
        )}
        <input type="file" accept="image/*" onChange={handleImageChange} />
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

      <div className="flex gap-2">
        <button className="save-button" onClick={handleSave}>저장하기</button>
        <button className="border rounded px-3" onClick={handleReset}>초기화</button>
      </div>

      {isSaved && <p className="save-message">변경사항이 저장되었습니다.</p>}
    </div>
  );
};

export default AgentProfile;
