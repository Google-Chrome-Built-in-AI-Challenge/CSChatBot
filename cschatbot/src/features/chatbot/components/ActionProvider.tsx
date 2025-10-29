import React, { ReactElement, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapLocalAI } from '../ai/bootstrap';

type CreateMsgFn = (message: string, options?: Record<string, unknown>) => any;

interface ActionProviderProps {
  createChatBotMessage: CreateMsgFn;
  setState: React.Dispatch<React.SetStateAction<any>>;
  children: React.ReactNode;
}
interface BotMessage { message: string; [key: string]: unknown; }
interface State { messages: BotMessage[]; [key: string]: unknown; }
type AIBundle = Awaited<ReturnType<typeof bootstrapLocalAI>>;

const MAX_OUT = 280;         // 최종 메시지 길이 제한
const MAX_SENTENCES = 2;     // 한국어 2문장

export const ActionProvider: React.FC<ActionProviderProps> = ({
  createChatBotMessage, setState, children,
}) => {
  const nav = useNavigate();
  const aiRef = useRef<AIBundle | null>(null);

  const appendBot = (text: string, options?: Record<string, unknown>) => {
    const botMessage = createChatBotMessage(text, options);
    setState((prev: State) => ({ ...prev, messages: [...prev.messages, botMessage] }));
  };

  // 마지막 봇 메시지 교체(스트리밍 표시용)
  const replaceLastBot = (text: string) => {
    setState((prev: State) => {
      const msgs = [...prev.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if ((msgs[i] as any).type === 'bot' || (msgs[i] as any).message !== undefined) {
          msgs[i] = { ...(msgs[i] as any), message: text };
          break;
        }
      }
      return { ...prev, messages: msgs };
    });
  };

  const ensureAI = async (): Promise<AIBundle> => {
    if (aiRef.current) return aiRef.current;
    console.log('[ActionProvider] bootstrapLocalAI starting...');
    aiRef.current = await bootstrapLocalAI((kind, r) => {
      console.log(`[ActionProvider] download ${kind}: ${Math.round(r * 100)}%`);
    });
    console.log('[ActionProvider] bootstrapLocalAI ready');
    return aiRef.current!;
  };

  // 샘플 액션
  const handleTicketPurchase = () => appendBot('티켓 구매 옵션을 선택해주세요', { widget: 'ticketPurchaseOptions' });
  const handleClickHomepage = () => nav('/ticket/reservation');
  const handleClickTicketLink = () => window.open('https://www.ticketlink.co.kr/sports/137/62', '_blank');
  const handleUnknownMessage = () => appendBot('죄송해요. 무슨 말씀이신지 잘 모르겠어요.🥺');

  // ===== 메인 파이프라인 =====
  const handleUserText = async (raw: string) => {
  try {
    const ai = await ensureAI();
    const agentLang = ai.agentLang ?? 'en';

    // 0) 언어 감지
    let srcLang = agentLang;
    if (raw.trim().length >= 2 && ai.detector?.detect) {
      const list = await ai.detector.detect(raw);
      const top = Array.isArray(list) ? list[0] : null;
      if (top?.detectedLanguage) srcLang = top.detectedLanguage;
      console.log('[ActionProvider] detected lang:', srcLang);
    }

    // 1) 입력을 에이전트 언어(=영어)로 변환
    const tooShort = raw.trim().length < 6;
    const toAgent =
      (!tooShort && srcLang !== agentLang)
        ? await ai.getTranslator(srcLang, agentLang)
        : null;
    const normalized = toAgent ? await toAgent.translate(raw) : raw;

    // 2) 프롬프트 구성
    const sysRule = `Respond in English. No markdown. 
    Use at most 4 sentences (<=350 chars total).`;
    const promptInput = `${sysRule}\nUser: ${normalized}\nAgent:`;

    // 3) 초안 생성 (스트리밍 그대로)
    appendBot('…');
    let draft = '';
    const stream = ai.prompt.promptStream(promptInput);
    for await (const chunk of stream) {
      draft += chunk;
      if (draft.length % 40 < chunk.length) {
        replaceLastBot('생성 중…');
        await new Promise(r => setTimeout(r));
      }
    }

    // 4) ★입력 언어로 번역★
    //    영어 입력 → 그대로
    //    한국어 입력 → en→ko 번역
    //    프랑스어 입력 → en→fr 번역
    let finalLocalized = draft;
    if (srcLang !== agentLang) {
      const back = await ai.getTranslator(agentLang, srcLang);
      if (back?.translateStream) {
        let t = '';
        for await (const c of back.translateStream(draft)) {
          t += c;
          replaceLastBot(t.slice(0, 360));
        }
        finalLocalized = t;
      } else if (back) {
        finalLocalized = await back.translate(draft);
      }
    }

    // 5) 문장수/길이 제한
    const cut = (s: string) =>
      s.length > 360 ? s.slice(0, 359) + '…' : s;
    const sentenceClamp = (s: string) =>
      s.split(/(?<=[.!?。？！])\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(' ')
        .trim();

    const finalText = cut(sentenceClamp(finalLocalized));
    replaceLastBot(finalText || '응답을 생성하지 못했습니다.');
  } catch (e) {
    console.error('[ActionProvider] handleUserText error:', e);
    appendBot(
      '로컬 AI 사용이 불가합니다. 데스크톱 Chrome 138+와 저장공간(≥22GB)을 확인한 뒤 다시 시도해주세요.'
    );
  }
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
              handleUserText
            },
          });
        }
        return child;
      })}
    </div>
  );
};
