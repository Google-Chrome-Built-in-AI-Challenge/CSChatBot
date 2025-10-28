import React, { ReactElement } from 'react';
import { useNavigate } from 'react-router';

interface ActionProviderProps {
  createChatBotMessage: (
    message: string,
    options?: Record<string, unknown>
  ) => unknown;
  setState: React.Dispatch<React.SetStateAction<unknown>>;
  children: React.ReactNode;
}

interface BotMessage {
  message: string;
  [key: string]: unknown;
}

interface State {
  messages: BotMessage[];
  [key: string]: unknown;
}

const ActionProvider: React.FC<ActionProviderProps> = ({
  createChatBotMessage,
  setState,
  children,
}) => {
  const nav = useNavigate();

  const handleTicketPurchase = () => {
    const botMessage = createChatBotMessage('티켓 구매 옵션을 선택해주세요', {
      widget: 'ticketPurchaseOptions',
    });

    setState((prev: State) => ({
      ...prev,
      messages: [...prev.messages, botMessage],
    }));
  };

  const handleClickHomepage = () => {
    nav('/ticket/reservation');
  };

  const handleClickTicketLink = () => {
    window.open('https://www.ticketlink.co.kr/sports/137/62', '_blank');
  };

  const handleUnknownMessage = () => {
    const botMessage = createChatBotMessage(
      '죄송해요. 무슨 말씀이신지 잘 모르겠어요.🥺'
    );
    setState((prev: State) => ({
      ...prev,
      messages: [...prev.messages, botMessage],
    }));
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as ReactElement, {
            actions: {
              handleTicketPurchase,
              handleUnknownMessage,
              handleClickHomepage,
              handleClickTicketLink,
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export { ActionProvider };