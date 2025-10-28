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
      <h1>챗봇 관리자 설정 대시보드</h1>
      <a>에이전트 프로필 설정하기</a>
      <a>용어사전 설정하기</a>
      <a>FAQ 설정하기</a>
      <a>도큐먼트/아티클 설정하기</a>
      <div className="card">
        {!showChatbot && (
          <Button
            onClick={() => setShowChatbot(true)}
            className="w-12 h-12 rounded-full bg-white border fixed bottom-20 right-2 hover:bg-wiz-red hover:text-wiz-white"
          >
            챗봇 구동시키기
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
    </BrowserRouter>
  )
}

export default App
