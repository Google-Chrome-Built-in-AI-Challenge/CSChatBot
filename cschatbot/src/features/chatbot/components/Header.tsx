import styled from "styled-components";
import { X } from "lucide-react";

const HeaderContainer = styled.div`
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 100%
  );
  width: 100%;
  min-width: 280px; /* 혹시 너무 좁게 잘리는 경우 방지 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 1rem 1rem; /* 오른쪽 여백 확실히 */
  box-sizing: border-box; /* padding 포함해서 width 계산되게 */
  overflow: visible; /* 혹시 잘림 방지 */
  z-index: 10; /* 혹시 다른 레이어에 가려지는 경우 방지 */

  h4 {
    color: #ffffff;
    font-weight: 600;
    font-size: 1.1rem;
    margin: 0;
  }

  .icon {
    font-size: 1.5rem;
    color: #ffffff;
    cursor: pointer;
    transition: opacity 0.2s ease;
    flex-shrink: 0; /* 아이콘이 눌리지 않게 */
  }

  .icon:hover {
    opacity: 0.7;
  }
`;


const Header = () => {
  const handleClose = () => {
    const event = new CustomEvent("closeChatbot");
    window.dispatchEvent(event);
  };

  return (
    <HeaderContainer>
      <h4>chatbot</h4>
      <X className="icon" onClick={handleClose} />
    </HeaderContainer>
  );
};

export default Header;