import React, { useState, ChangeEvent } from 'react';

const AgentProfile = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isSaved, setIsSaved] = useState(false);

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

  // 모든 정보 저장 (한 번에)
  const handleSave = () => {
    const agentData = {
      name,
      role,
      profileImage,
    };
    console.log("저장된 데이터:", agentData);

    // 원하시면 localStorage에도 저장 가능
    localStorage.setItem("agentProfile", JSON.stringify(agentData));

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000); // 2초 뒤 저장 완료 메시지 사라짐
  };

  return (
    <div className="centered-view">
      <h2>에이전트 프로필 설정</h2>

      {/* 프로필 사진 업로드 */}
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
        <label>이름</label>
        <input
          type="text"
          placeholder="에이전트 이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 역할 설명 입력 */}
      <div className="form-group">
        <label>역할 설명</label>
        <textarea
          placeholder="에이전트의 역할을 설명하세요"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>

      {/* 저장 버튼 */}
      <button className="save-button" onClick={handleSave}>
        저장하기
      </button>

      {isSaved && <p className="save-message">✅ 변경사항이 저장되었습니다.</p>}
    </div>
  );
};

export default AgentProfile;