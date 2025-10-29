import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import config from './features/chatbot/config';
import { Button } from './components/ui/button/button';
import Chatbot from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import { ActionProvider, MessageParser } from './features/chatbot';
import './features/chatbot/chatbot.css';
import { BrowserRouter, Route, Routes } from 'react-router';
import "./styles/chatbot.css";
import SettingsDropdown from './features/chatbot/components/SettingDropdown';


function App() {
  const [count, setCount] = useState(0)
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    const handleCloseChatbot = () => {
      setShowChatbot(false);
    };
    window.addEventListener('closeChatbot', handleCloseChatbot);

    return () => {
      window.removeEventListener('closeChatbot', handleCloseChatbot);
    };
  }, []);

  return (
    <BrowserRouter>
      <h1>cschatbot</h1>
      <header style={{ display: "flex", justifyContent: "flex-end", padding: "1rem" }}>
        <SettingsDropdown />
      </header>
      {/* <div className="card"> */}
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
      {/* </div> */}
    </BrowserRouter>
  )
}

export default App
