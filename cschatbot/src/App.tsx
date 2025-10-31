// src/App.tsx
import { useEffect, useRef, useState } from 'react';
import './App.css';
import config from './features/chatbot/config';
import { Button } from './components/ui/button/button';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { ActionProvider, MessageParser } from './features/chatbot';
import './features/chatbot/chatbot.css';
import { BrowserRouter } from 'react-router';
import AgentProfile from './features/views/AgentProfile';
import Glossary from './features/views/Glossary';
import FAQ from './features/views/FAQ';
import Docs from './features/views/Docs';

import {
  ChatbotPreset,
  buildPresetSnapshot,
  exportPresetToFile,
  importPresetFromFile,
  resetPreset,
} from './features/presetManager';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [titleMoved, setTitleMoved] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);

  // 프리셋 메시지
  const [presetMessage, setPresetMessage] = useState<string | null>(null);

  // 업로드용 숨김 input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // 파일 Export
  const handleSavePreset = () => {
    const snap: ChatbotPreset = buildPresetSnapshot();
    exportPresetToFile(snap);
    setPresetMessage('Preset exported as file');
    setTimeout(() => setPresetMessage(null), 1500);
  };

  // 파일 Import 트리거
  const handleLoadPreset = () => {
    fileInputRef.current?.click();
  };

  // 파일 선택 처리
  const onPresetFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!f) return;
    try {
      await importPresetFromFile(f);
      setPresetMessage('Preset imported');
      setTimeout(() => setPresetMessage(null), 1200);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setPresetMessage(err?.message || 'Invalid preset file');
      setTimeout(() => setPresetMessage(null), 1800);
    }
  };

  const handleResetPreset = () => {
    resetPreset();
    setPresetMessage('Preset reset!');
    setTimeout(() => setPresetMessage(null), 1200);
    window.location.reload();
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* 업로드 숨김 input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={onPresetFileChosen}
        />

        <h1 className={`main-title ${titleMoved ? 'move' : ''}`}>cschatbot</h1>

        <div className={`dashboard-area ${showDashboard ? 'show' : ''}`}>
          {/* 프리셋 버튼 - 오른쪽 상단 */}
          {showDashboard && (
            <div
              className="preset-buttons-vertical"
              style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                zIndex: 100,
              }}
            >
              <Button onClick={handleSavePreset}>Save Preset</Button>
              <Button onClick={handleLoadPreset}>Load Preset</Button>
              <Button onClick={handleResetPreset}>Reset Preset</Button>
              {presetMessage && (
                <span
                  style={{
                    color: 'green',
                    marginTop: '0.5rem',
                    fontSize: '0.9rem',
                    paddingLeft: '20px',
                  }}
                >
                  {presetMessage}
                </span>
              )}
            </div>
          )}

          <div className="dashboard-content" style={{ display: 'flex', gap: '2rem' }}>
            {/* Left: Settings buttons */}
            <div className="settings-list" style={{ minWidth: '200px' }}>
              <div className="setting-item" onClick={() => setActiveView('agent')}>
                Configure Agent Profile
              </div>
              {/* <div className="setting-item" onClick={() => setActiveView("glossary")}>
                Configure Glossary
              </div> */}
              <div className="setting-item" onClick={() => setActiveView('faq')}>
                Configure FAQ
              </div>
              <div className="setting-item" onClick={() => setActiveView('docs')}>
                Configure Documents/Articles
              </div>
            </div>

            {/* Right: Selected view */}
            <div className="view-area" style={{ flex: 1 }}>
              {activeView === 'agent' && <AgentProfile />}
              {activeView === 'glossary' && <Glossary />}
              {activeView === 'faq' && <FAQ />}
              {activeView === 'docs' && <Docs />}
            </div>
          </div>

          {/* FAQ button / Chatbot */}
          {!showChatbot ? (
            <Button onClick={() => setShowChatbot(true)} className="chatbot-toggle-btn">
              FAQ
            </Button>
          ) : (
            <Chatbot config={config} messageParser={MessageParser} actionProvider={ActionProvider} />
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
