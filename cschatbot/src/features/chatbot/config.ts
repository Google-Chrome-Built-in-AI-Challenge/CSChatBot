import React from 'react';
import { createChatBotMessage } from 'react-chatbot-kit';
import { Header, WidgetButton, WidgetButtonProps, Avatar } from './';

const config = {
  initialMessages: [
    createChatBotMessage("Hi, Lovely Glowner! yellow_heartdizzy \n 당신의 빛을 찾아주는 GLOWNY 입니다. \n✧ ​CS 운영 시간 \nMON - FRI : 11:00AM - 4:00PM \n(LUNCH: 12:00PM - 1:10PM) \nWEEKEND, HOLIDAY OFF \n로그인 후 문의를 남겨주시면 더 빠른 답변 받아보실 수 있습니다!", {
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