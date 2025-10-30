// src/features/chatbot/components/ActionProvider.tsx
import React, { ReactElement, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapLocalAI } from '../ai/bootstrap';
import { stripForLangDetect, hintByScript } from '../ai/textSanitize';

// NEW: 프리필터 + 의도매칭(쇼트리스트)
import { prefilterFAQ } from '../ai/faqPrefilter';
import { matchFAQFromShortlist, getFAQ as getFAQByIndex } from '../ai/faqMatcher';

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

// FAQ 연속 트리거 방지용: 동일 index 30초 쿨다운
const FAQ_COOLDOWN_MS = 30_000;
const faqCooldown = new Map<number, number>();

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
    aiRef.current = await bootstrapLocalAI(
      (kind, r) => console.log(`[ActionProvider] download ${kind}: ${Math.round(r * 100)}%`),
      { companyId: 'mari' }
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
      const agentLang = ai.agentLang ?? 'en';

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

        if (raw.trim().length < 2) srcLang = 'ko';
        console.log('[detect]', { srcLang, top });
      } catch (e) {
        console.warn('[detect] failed, fallback to agentLang', e);
        srcLang = agentLang;
      }

      // 1) 입력을 agentLang(기본 en)로 정규화
      const tooShort = raw.trim().length < 6;
      const toAgent =
        !tooShort && srcLang !== agentLang
          ? await ai.getTranslator(srcLang, agentLang)
          : null;
      const normalized = toAgent ? await toAgent.translate(raw) : raw;

      // ===== FAQ 라우팅: 프리필터 → 쇼트리스트 의도매칭 =====
      const faqsEnabled = true;
      if (faqsEnabled) {
        try {
          // 로컬 저장된 전체 FAQ 불러오기
          const allFaqs = JSON.parse(localStorage.getItem('faqList') || '[]');

          // 1차: 초저비용 프리필터 (원문 + 영문 병행 토큰)
          const pre = await prefilterFAQ(
            raw,
            allFaqs,
            async (s) => {
              const t = await ai.getTranslator(srcLang, 'en');
              return t ? await t.translate(s) : s;
            }
          );

          if (pre.length) {
            const shortlistIdx = pre.map(h => h.index);

            // 쿨다운 체크
            const now = Date.now();
            const cooled = shortlistIdx.filter(i => (now - (faqCooldown.get(i) ?? 0)) >= FAQ_COOLDOWN_MS);

            if (cooled.length) {
              // 2차: 내장 프롬프트로 의도 매칭(단일 최고 매치)
              const match = await matchFAQFromShortlist(ai.prompt, normalized, cooled);

              if (match && match.score >= 0.75) {
                const item = getFAQByIndex(match.index);
                if (item) {
                  faqCooldown.set(match.index, now);

                  // 원문 언어로 답변 로컬라이즈
                  let localized = item.answer;
                  if (srcLang !== agentLang) {
                    const back = await ai.getTranslator(agentLang, srcLang);
                    if (back) localized = await back.translate(localized);
                  }

                  // 페르소나 말투/호칭 보정
                  if (srcLang.startsWith('ko') && ai.persona?.replyStyle?.useHonorific) {
                    const honor = ai.persona?.honorifics?.ko || '고객님';
                    const head = localized.slice(0, 20);
                    if (!new RegExp(`${honor}|고객님|♥`).test(head)) {
                      localized = `${honor}, ${localized}`;
                    }
                  }
                  const endParticleKo = ai.persona?.replyStyle?.endingParticle;
                  if (endParticleKo && srcLang.startsWith('ko')) {
                    localized = localized.replace(/[.!?。？！]+$/, '');
                    if (!localized.endsWith(endParticleKo)) localized += endParticleKo;
                  }

                  // 길이 제한
                  const sentenceClamp = (s: string) =>
                    s.split(/(?<=[.!?。？！])\s+/).filter(Boolean).slice(0, 4).join(' ').trim();
                  const cut = (s: string) => s.length > 360 ? s.slice(0, 359) + '…' : s;
                  localized = cut(sentenceClamp(localized));

                  appendBot(localized);
                  return; // FAQ로 종료
                }
              }
            }
          }
        } catch (e) {
          console.warn('[FAQ] routing failed, fallback to generation', e);
        }
      }

      // ===== 평소 모드: 페르소나 기반 생성 =====
      const sysRule = `Respond in English. No markdown. Max 4 sentences, <=350 chars.`;
      const promptInput = `${sysRule}\nUser: ${normalized}\nAgent:`;

      appendBot('…');
      let draft = '';
      for await (const chunk of ai.prompt.promptStream(promptInput)) {
        draft += chunk;
        if (draft.length % 40 < chunk.length) {
          replaceLastBot('생성 중…');
          await new Promise((r) => setTimeout(r));
        }
      }

      // 역번역
      let localized = draft;
      if (srcLang !== agentLang) {
        const back = await ai.getTranslator(agentLang, srcLang);
        localized = back ? await back.translate(draft) : draft;
      }

      // 호칭 보정
      if (srcLang.startsWith('ko') && ai.persona?.replyStyle?.useHonorific) {
        const honor = ai.persona?.honorifics?.ko || '고객님';
        const head = localized.slice(0, 20);
        if (!new RegExp(`${honor}|고객님|♥`).test(head)) {
          localized = `${honor}, ${localized}`;
        }
      }

      // 길이 제한
      const sentenceClamp = (s: string) =>
        s.split(/(?<=[.!?。？！])\s+/).filter(Boolean).slice(0, 4).join(' ').trim();
      const cut = (s: string) => s.length > 360 ? s.slice(0, 359) + '…' : s;

      localized = cut(sentenceClamp(localized));

      // 끝말(조건부)
      const endParticle = ai.persona?.replyStyle?.endingParticle;
      if (endParticle && srcLang.startsWith('ko')) {
        localized = localized.replace(/[.!?。？！]+$/, '');
        if (!localized.endsWith(endParticle)) localized += endParticle;
      }

      replaceLastBot(localized || '응답을 생성하지 못했습니다.');

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
