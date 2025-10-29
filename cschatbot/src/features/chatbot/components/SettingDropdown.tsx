import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { Settings } from "lucide-react";

const Container = styled.div`
  position: fixed; /* 화면에 고정 */
  top: 20px;
  right: 20px;
  z-index: 1000; /* 다른 요소 위에 */
`;

const Button = styled.button`
  background-color: #848484ff;
  color: #fff;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background-color: #525252ff;
    transform: translateY(-2px);
  }
`;

const Dropdown = styled.div<{ open: boolean }>`
  position: absolute;
  top: 110%;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  display: ${({ open }) => (open ? "block" : "none")};
  min-width: 220px;
  z-index: 1001;
  animation: fadeIn 0.2s ease-out;

  a {
    display: block;
    padding: 0.8rem 1rem;
    color: #333;
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
    font-weight: 500;
  }

  a:hover {
    background-color: #bcbcbcff;
    color: #fff;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const SettingsDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Container ref={ref}>
      <Button onClick={() => setOpen((prev) => !prev)}>
        설정 <Settings size={18} />
      </Button>
      <Dropdown open={open}>
        <a href="#">에이전트 프로필 설정하기</a>
        <a href="#">용어사전 설정하기</a>
        <a href="#">FAQ 설정하기</a>
        <a href="#">도큐먼트/아티클 설정하기</a>
      </Dropdown>
    </Container>
  );
};

export default SettingsDropdown;