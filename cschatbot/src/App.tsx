import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import config from './features/chatbot/config';
import { Button } from './components/ui/button/button';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { ActionProvider, MessageParser } from './features/chatbot';
import './features/chatbot/chatbot.css';
import { BrowserRouter } from 'react-router';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [titleMoved, setTitleMoved] = useState(false);

  useEffect(() => {
    const moveTimer = setTimeout(() => setTitleMoved(true), 1000);
    const showTimer = setTimeout(() => setShowDashboard(true), 2000);
    return () => {
      clearTimeout(moveTimer);
      clearTimeout(showTimer);
    };
  }, []);

  useEffect(() => {
    const handleCloseChatbot = () => setShowChatbot(false);
    window.addEventListener('closeChatbot', handleCloseChatbot);
    return () => window.removeEventListener('closeChatbot', handleCloseChatbot);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        <h1 className={`main-title ${titleMoved ? 'move' : ''}`}>cschatbot</h1>

        <div className={`dashboard-area ${showDashboard ? 'show' : ''}`}>
          {/* 설정 목록 세로 리스트 */}
          <div className="settings-list">
            <div className="setting-item">
              <span className="divider" />에이전트 프로필 설정하기
            </div>
            <div className="setting-item">
              <span className="divider" />용어사전 설정하기
            </div>
            <div className="setting-item">
              <span className="divider" />FAQ 설정하기
            </div>
            <div className="setting-item">
              <span className="divider" />도큐먼트/아티클 설정하기
            </div>
          </div>

          {!showChatbot && (
            <Button
              onClick={() => setShowChatbot(true)}
              className="chatbot-toggle-btn"
            >
              FAQ
            </Button>
          )}
          {showChatbot && (
            <Chatbot
              config={config}
              messageParser={MessageParser}
              actionProvider={ActionProvider}
            />
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;