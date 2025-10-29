import { useEffect, useState } from 'react';
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

function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [titleMoved, setTitleMoved] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);

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
            <div className="settings-list">
              <div className="setting-item" onClick={() => setActiveView("agent")}>
                에이전트 프로필 설정하기
              </div>
              <div className="setting-item" onClick={() => setActiveView("glossary")}>
                용어사전 설정하기
              </div>
              <div className="setting-item" onClick={() => setActiveView("faq")}>
                FAQ 설정하기
              </div>
              <div className="setting-item" onClick={() => setActiveView("docs")}>
                도큐먼트/아티클 설정하기
              </div>
            </div>

            <div className="view-area">
              {activeView === "agent" && <AgentProfile />}
              {activeView === "glossary" && <Glossary />}
              {activeView === "faq" && <FAQ />}
              {activeView === "docs" && <Docs />}
            </div>

            {!showChatbot ? (
              <Button
                onClick={() => setShowChatbot(true)}
                className="chatbot-toggle-btn"
              >
                FAQ
              </Button>
            ) : (
              <Chatbot
                config={config}
                messageParser={MessageParser}
                actionProvider={ActionProvider}
              />
            )}
          </div> {/* dashboard-area 닫힘 */}
        </div> {/* app-container 닫힘 */}
      </BrowserRouter>
  );
}

export default App;