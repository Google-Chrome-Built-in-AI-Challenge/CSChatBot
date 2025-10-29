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

// 성능 실험용: 필요시 true로 바꿔 Writer 생략
const USE_WRITER = false;

// ★ 마지막 안전가드: 너무 길면 컷
function enforceBrevityKo(s: string, maxChars = 280) {
  const t = s.replace(/\n{2,}/g, '\n').trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1).replace(/\s+\S*$/, '') + '…';
}

const ActionProvider: React.FC<ActionProviderProps> = ({
  createChatBotMessage, setState, children,
}) => {
  const nav = useNavigate();
  const aiRef = useRef<AIBundle | null>(null);

  const appendBot = (text: string, options?: Record<string, unknown>) => {
    const botMessage = createChatBotMessage(text, options);
    setState((prev: State) => ({ ...prev, messages: [...prev.messages, botMessage] }));
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

  // ===== 메인: 로컬 AI 파이프라인 (최종 출력은 항상 한국어) =====
  const handleUserText = async (raw: string) => {
    try {
      const ai = await ensureAI();
      console.log('[ActionProvider] handleUserText raw:', raw);

      // 0) 언어 감지
      let srcLang = ai.persona.agentLang ?? 'en';
      if (raw.trim().length >= 2 && ai.detector?.detect) {
        const list = await ai.detector.detect(raw);
        const top = Array.isArray(list) ? list[0] : null;
        if (top?.detectedLanguage) srcLang = top.detectedLanguage;
        console.log('[ActionProvider] detected lang:', srcLang, top);
      }

      // 1) 입력을 agent 언어(영)로 정규화
      const toAgent = srcLang !== ai.persona.agentLang
        ? await ai.translatorFactory?.(srcLang)
        : null;
      const normalized = toAgent ? await toAgent.translate(raw) : raw;
      console.log('[ActionProvider] normalized(en):', normalized);

      // 2) FAQ 얕은 매칭
      const faqHit =
        ai.faq?.find((f: any) =>
          String(normalized).toLowerCase().includes(String(f.q).toLowerCase())
        ) ?? null;
      console.log('[ActionProvider] faqHit:', !!faqHit);

      // 3) 초안 생성: 답변은 짧고 핵심만 (영어로 생성)
      const draft = faqHit
        ? faqHit.a
        : await ai.prompt.prompt(
            [
              'You are a customer support agent. Keep it concise.',
              'Rules:',
              '- Maximum 2 short sentences or 3 bullet points.',
              '- No preambles, no headings, no markdown unless bullets.',
              '- Focus on the exact user ask.',
              '',
              `User: ${normalized}`,
              'Agent:',
            ].join('\n')
          );
      console.log('[ActionProvider] draftPreview:', String(draft).slice(0, 140));

      // 4) Writer로 톤/금지어 보정(선택)
      const maybePolished = USE_WRITER
        ? await ai.writer.write(String(draft), {
            context: `Tone=${ai.persona.tone}; Avoid=${ai.persona.forbiddenPhrases?.join(', ')};
                      Style=very concise, max 2 sentences or 3 bullets.`,
          })
        : String(draft);

      // 5) 최종 출력은 항상 한국어
      const toKo = await ai.getTranslator(ai.persona.agentLang ?? 'en', ai.displayLang ?? 'ko');
      const korean = toKo ? await toKo.translate(maybePolished) : maybePolished;

      // 6) 마지막 안전가드로 더 줄이기
      const finalText = enforceBrevityKo(korean, 280);

      appendBot(finalText);
    } catch (e) {
      console.error('[ActionProvider] handleUserText error:', e);
      appendBot('로컬 AI 사용이 불가합니다. 데스크톱 Chrome 138+와 저장공간(≥22GB)을 확인한 뒤 다시 시도해주세요.');
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
              handleUserText,
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export { ActionProvider };
