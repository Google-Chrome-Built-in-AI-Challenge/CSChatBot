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
            <div className="dashboard-content" style={{ display: 'flex', gap: '2rem' }}>
              {/* Left: Settings buttons */}
              <div className="settings-list" style={{ minWidth: '200px' }}>
                <div className="setting-item" onClick={() => setActiveView("agent")}>
                  Configure Agent Profile
                </div>
                {/* <div className="setting-item" onClick={() => setActiveView("glossary")}>
                  Configure Glossary
                </div> */}
                <div className="setting-item" onClick={() => setActiveView("faq")}>
                  Configure FAQ
                </div>
                <div className="setting-item" onClick={() => setActiveView("docs")}>
                  Configure Documents/Articles
                </div>
              </div>

              {/* Right: Selected view */}
              <div className="view-area" style={{ flex: 1 }}>
                {activeView === "agent" && <AgentProfile />}
                {activeView === "glossary" && <Glossary />}
                {activeView === "faq" && <FAQ />}
                {activeView === "docs" && <Docs />}
              </div>
            </div>

            {/* FAQ button / Chatbot */}
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
          </div>
        </div>
      </BrowserRouter>
  );
}

export default App;