// src/features/chatbot/components/MessageParser.tsx
import React, { ReactElement } from 'react';

// 키워드 분기 기본값 유지. 그 외 입력은 AI로 위임.
interface Actions {
  handleTicketPurchase: () => void;
  handleUnknownMessage: () => void;
  handleUserText?: (raw: string) => void;
  handleClickHomepage?: () => void;
  handleClickTicketLink?: () => void;
}

interface MessageParserProps {
  children: React.ReactNode;
  actions: Actions;
}

const MessageParser: React.FC<MessageParserProps> = ({ children, actions }) => {
  const parse = (message: string): void => {
    const t = message.trim();
    console.log('[MessageParser] parse:', t);
    if (!t) return;

    // 티켓 관련 의도: "티켓" + ("사" 또는 "구매")
    if (t.includes('티켓') && (t.includes('사') || t.includes('구매'))) {
      console.log('[MessageParser] route: ticket');
      actions.handleTicketPurchase();
      return;
    }

    // 기본 경로: 로컬 AI
    if (typeof actions.handleUserText === 'function') {
      console.log('[MessageParser] route: AI');
      actions.handleUserText(message);
    } else {
      console.log('[MessageParser] route: unknown');
      actions.handleUnknownMessage();
    }
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as ReactElement, {
            parse,
            actions,
          });
        }
        return child;
      })}
    </div>
  );
};

export { MessageParser };
