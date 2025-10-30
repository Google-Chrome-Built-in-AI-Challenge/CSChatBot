import React, { ReactElement, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapLocalAI } from '../ai/bootstrap';
import { stripForLangDetect, hintByScript } from '../ai/textSanitize';

type CreateMsgFn = (message: string, options?: Record<string, unknown>) => any;

interface ActionProviderProps {
  createChatBotMessage: CreateMsgFn;
  setState: React.Dispatch<React.SetStateAction<any>>;
  children: React.ReactNode;
}
interface BotMessage { message: string; [key: string]: unknown; }
interface State { messages: BotMessage[]; [key: string]: unknown; }
type AIBundle = Awaited<ReturnType<typeof bootstrapLocalAI>>;

const MAX_OUT = 280;
const MAX_SENTENCES = 2;

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

  // src/features/chatbot/components/ActionProvider.tsx
  const ensureAI = async (): Promise<AIBundle> => {
    if (aiRef.current) return aiRef.current;
    console.log('[ActionProvider] bootstrapLocalAI starting...');
    aiRef.current = await bootstrapLocalAI(
      (kind, r) => console.log(`[ActionProvider] download ${kind}: ${Math.round(r * 100)}%`),
      { companyId: 'mari' } // ★ 여기
    );
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
    const agentLang = ai.agentLang ?? "en";

    // 0) 언어 감지
    let srcLang = agentLang;
    try {
      const clean = stripForLangDetect(raw);
      let top: any = null;

      if (clean.length >= 2 && ai.detector?.detect) {
        const list = await ai.detector.detect(clean);
        top = Array.isArray(list) ? list[0] : list;
      }

      if (top?.detectedLanguage && (top.confidence ?? 0) >= 0.6) {
        srcLang = top.detectedLanguage;
      } else {
        srcLang = hintByScript(raw) ?? agentLang;
      }

      if (raw.trim().length < 2) srcLang = "ko";
      console.log("[detect]", { srcLang, top });
    } catch (e) {
      console.warn("[detect] failed, fallback to agentLang", e);
      srcLang = agentLang;
    }

    // 1) 입력을 영어(agentLang)로 변환
    const tooShort = raw.trim().length < 6;
    const toAgent =
      !tooShort && srcLang !== agentLang
        ? await ai.getTranslator(srcLang, agentLang)
        : null;
    const normalized = toAgent ? await toAgent.translate(raw) : raw;

    // 2) 프롬프트 구성 — 영어로 생성하도록 시스템 규칙 명시
    const sysRule = `Respond in English. No markdown. Max 4 sentences, <=350 chars.`;
    const promptInput = `${sysRule}\nUser: ${normalized}\nAgent:`;

    // 3) 응답 생성 (스트리밍)
    appendBot("…");
    let draft = "";
    for await (const chunk of ai.prompt.promptStream(promptInput)) {
      draft += chunk;
      if (draft.length % 40 < chunk.length) {
        replaceLastBot("생성 중…");
        await new Promise((r) => setTimeout(r));
      }
    }

    // 4) 입력 언어로 역번역
    let localized = draft;
    if (srcLang !== agentLang) {
      const back = await ai.getTranslator(agentLang, srcLang);
      localized = back ? await back.translate(draft) : draft;
    }

    // 5) 호칭 보정(조건부)
    if (srcLang.startsWith('ko') && ai.persona?.replyStyle?.useHonorific) {
      const honor = ai.persona?.honorifics?.ko || '고객님';
      const head = localized.slice(0, 20);
      if (!new RegExp(`${honor}|고객님|♥`).test(head)) {
        localized = `${honor}, ${localized}`;
      }
    }

    // 6) 문장/글자 제한 (이미 있던 로직 유지)
    const sentenceClamp = (s: string) =>
      s.split(/(?<=[.!?。？！])\s+/).filter(Boolean).slice(0, 4).join(' ').trim();
    const cut = (s: string) => s.length > 360 ? s.slice(0, 359) + '…' : s;

    localized = cut(sentenceClamp(localized));

    // 7) 말투 후처리(끝말, 조건부)
    const endParticle = ai.persona?.replyStyle?.endingParticle;
    if (endParticle && srcLang.startsWith('ko')) {
      localized = localized.replace(/[.!?。？！]+$/, '');
      if (!localized.endsWith(endParticle)) localized += endParticle;
    }

    replaceLastBot(localized || '응답을 생성하지 못했습니다.');

  } catch (e) {
    console.error("[ActionProvider] handleUserText error:", e);
    appendBot(
      "로컬 AI 사용이 불가합니다. 데스크톱 Chrome 138+와 저장공간(≥22GB)을 확인한 뒤 다시 시도해주세요."
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
