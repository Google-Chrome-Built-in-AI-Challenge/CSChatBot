import React, { useEffect, useState } from 'react';

type StoredProfile = { name: string; role: string; profileImage: string | null };

function Avatar() {
  const [avatarUrl, setAvatarUrl] = useState<string>('/assets/react.svg');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agentProfile');
      if (raw) {
        const p: StoredProfile = JSON.parse(raw);
        if (p.profileImage) {
          setAvatarUrl(p.profileImage);
        }
      }
    } catch {
      setAvatarUrl('/assets/react.svg');
    }
  }, []);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: '#fff',
    border: '1.5px solid #e0e0e0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  };

  return (
    <div style={containerStyle}>
      <img src={avatarUrl} alt="에이전트 아바타" style={imageStyle} />
    </div>
  );
}

export { Avatar };