import React from 'react';
import { createChatBotMessage } from 'react-chatbot-kit';
import Header from './components/Header';
import { WidgetButton, WidgetButtonProps, Avatar } from './';

// 로컬스토리지에서 greeting 불러오기
const storedProfile = localStorage.getItem('agentProfile');
let greeting = "Hi! I'm your chatbot."; // 기본값
if (storedProfile) {
  try {
    const parsed = JSON.parse(storedProfile);
    if (parsed.greeting) greeting = parsed.greeting;
  } catch {}
}

const config = {
  initialMessages: [
    createChatBotMessage(greeting, {
      delay: 500,
      widget: 'firstButtons',
    }),
  ],
  widgets: [
    {
      widgetName: 'ticketPurchaseOptions',
      widgetFunc: (props: WidgetButtonProps) =>
        React.createElement(WidgetButton, props),
      props: {},
      mapStateToProps: [],
    },
  ],
  customComponents: {
    header: () => React.createElement(Header),
    botAvatar: () => React.createElement(Avatar),
  },
};

export default config;