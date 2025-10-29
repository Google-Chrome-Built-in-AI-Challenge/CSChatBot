import React, { useState, ChangeEvent } from 'react';


const AgentProfile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  // 이미지 선택 시 미리보기 처리
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="centered-view">
      <h2>에이전트 프로필 설정</h2>

      {/* 프로필 사진 */}
      <div className="profile-image-container">
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="profile-image" />
        ) : (
          <div className="profile-placeholder">프로필 사진</div>
        )}
        <input type="file" accept="image/*" onChange={handleImageChange} />
      </div>

      {/* 이름 입력 */}
      <div className="form-group">
        <label>이름:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="에이전트 이름을 입력하세요"
        />
      </div>

      {/* 역할 설명 입력 */}
      <div className="form-group">
        <label>역할 설명:</label>
        <textarea
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="에이전트 역할을 설명하세요"
        />
      </div>
    </div>
  );
};

export default AgentProfile;