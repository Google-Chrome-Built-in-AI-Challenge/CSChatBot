// src/features/chatbot/components/ActionProvider.tsx
import React, { ReactElement, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapLocalAI } from '../ai/bootstrap';
import { stripForLangDetect, hintByScript } from '../ai/textSanitize';
import { prefilterFAQ } from '../ai/faqPrefilter';
import { matchFAQFromShortlist, getFAQ as getFAQByIndex } from '../ai/faqMatcher';

type CreateMsgFn = (message: string, options?: Record<string, unknown>) => any;
type Article = { id: string; title: string; body?: string; content?: string; lang?: string };

interface ActionProviderProps {
  createChatBotMessage: CreateMsgFn;
  setState: React.Dispatch<React.SetStateAction<any>>;
  children: React.ReactNode;
}
interface BotMessage { message: string; [key: string]: unknown; }
interface State { messages: BotMessage[]; [key: string]: unknown; }
type AIBundle = Awaited<ReturnType<typeof bootstrapLocalAI>>;

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
    aiRef.current = await bootstrapLocalAI(
      (kind, r) => console.log(`[ActionProvider] download ${kind}: ${Math.round(r * 100)}%`),
      { companyId: 'mari' }
    );
    // 페르소나가 지정한 언어가 없으면 ko로 강제
    if (!aiRef.current.agentLang) (aiRef.current as any).agentLang = 'ko';
    return aiRef.current!;
  };

  // 재색인(문서 "학습") 이벤트 리스너
  // ActionProvider.tsx — onRebuild 안
useEffect(() => {
  const onRebuild = async () => {
    try {
      const ai = await ensureAI();
      const raw = JSON.parse(localStorage.getItem('docArticles:v1') || '[]');

      // content -> body 매핑 + 마크다운 간단 제거
      const stripMd = (s: string) =>
        (s || '')
          .replace(/```[\s\S]*?```/g, ' ')    // fenced code
          .replace(/`[^`]*`/g, ' ')          // inline code
          .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
          .replace(/\[[^\]]*\]\([^)]+\)/g, ' ')
          .replace(/^#{1,6}\s+/gm, '')       // headings
          .replace(/[*_~>`#>-]/g, ' ')       // markdown symbols
          .replace(/\s+/g, ' ')
          .trim();

      const articles = (Array.isArray(raw) ? raw : []).map((a: any) => ({
        id: a.id,
        title: a.title || '',
        body: stripMd(a.content || ''),   // ← 핵심
      }));

      const { compileIndex } = await import('@/features/chatbot/ai/docIndex');
      await compileIndex(ai, articles);
      console.log('[docIndex] rebuilt with', articles.length, 'articles');
    } catch (e) {
      console.error('[docIndex] rebuild failed', e);
    }
  };

  window.addEventListener('docIndex:rebuild', onRebuild);
  return () => window.removeEventListener('docIndex:rebuild', onRebuild);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


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

      // 0) 언어 감지 with CJK 가드
      let srcLang = agentLang;
      try {
        const clean = stripForLangDetect(raw);
        let top: any = null;

        if (clean.length >= 2 && ai.detector?.detect) {
          const list = await ai.detector.detect(clean);
          top = Array.isArray(list) ? list[0] : list;
        }

        const hasHangul = (s: string) => /[가-힣]/.test(s);
        const hangulRatio = (s: string) => {
          const all = s.replace(/\s/g, '').length || 1;
          const ko = (s.match(/[가-힣]/g) || []).length;
          return ko / all;
        };

        const scriptHint = hintByScript(raw); // ko|ja|zh|...
        const detLang = top?.detectedLanguage || agentLang;
        const conf = top?.confidence ?? 0;

        const short = raw.trim().length <= 3;
        const koStrong = hasHangul(raw) && (hangulRatio(raw) >= 0.15 || short);

        if (koStrong) {
          srcLang = 'ko';
        } else if (scriptHint && scriptHint !== 'und') {
          srcLang = conf >= 0.85 ? detLang : scriptHint;
        } else {
          srcLang = conf >= 0.75 ? detLang : agentLang;
        }

        if (raw.trim().length < 2) srcLang = 'ko';
        console.log('[detect]', { srcLang, top });
      } catch (e) {
        console.warn('[detect] failed, fallback to agentLang', e);
        srcLang = agentLang;
      }

      // 1) 입력을 agentLang(기본 en)로 정규화
      const toAgent = srcLang !== agentLang
        ? await ai.getTranslator(srcLang, agentLang)
        : null;
      const normalized = toAgent ? await toAgent.translate(raw) : raw;

      // 1.5) 초단문 fast-intent 라우터 (규칙 기반)
      const normKo = raw.replace(/\s+/g, '').toLowerCase();
      const fastIntents: Array<{tag: string; kws: string[]}> = [
        { tag: 'refund',  kws: ['환불','환불해줘','환불할래','반품'] },
        { tag: 'exchange',kws: ['교환','교환해줘'] },
        { tag: 'cancel',  kws: ['취소','주문취소'] },
        { tag: 'shipping',kws: ['배송','배송조회','언제와'] },
        { tag: 'restock', kws: ['재입고'] },
        { tag: 'address', kws: ['주소변경','주소바꿔','주소 바꿔'] },
        { tag: 'receipt', kws: ['영수증','증빙','현금영수증'] },
      ];

      const hitTag = fastIntents.find(x => x.kws.some(k => normKo.includes(k)))?.tag;
      let fastMatchedFaq: any | null = null;

      if (hitTag) {
        const allFaqs = JSON.parse(localStorage.getItem('faqList') || '[]');
        // 아주 단순 매핑: 태그별 대표 키워드로 FAQ 질문을 스캔
        const pick = (preds: string[]) =>
          allFaqs.find((f: any) => preds.some(p => (f.question || '').includes(p)));

        if (hitTag === 'refund')   fastMatchedFaq = pick(['환불','반품']);
        if (hitTag === 'exchange') fastMatchedFaq = pick(['교환']);
        if (hitTag === 'cancel')   fastMatchedFaq = pick(['취소']);
        if (hitTag === 'shipping') fastMatchedFaq = pick(['배송']);
        if (hitTag === 'restock')  fastMatchedFaq = pick(['재입고']);
        if (hitTag === 'address')  fastMatchedFaq = pick(['주소']);
        if (hitTag === 'receipt')  fastMatchedFaq = pick(['영수증','증빙']);

        if (fastMatchedFaq) {
          let localized = fastMatchedFaq.answer ?? '';

          // 문서 연결 시 DOC ID 표시(임시 요구사항)
          if (fastMatchedFaq.docId) {
            localized += `\n\nDOC ID: ${fastMatchedFaq.docId}`;
          }
          appendBot(localized);
          return; // Fast path 종료
        }
      }

      // ===== FAQ 라우팅: 프리필터 → 쇼트리스트 의도매칭 =====
      const faqsEnabled = true;
      if (faqsEnabled) {
        try {
          const allFaqs = JSON.parse(localStorage.getItem('faqList') || '[]');

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
              console.log('[FAQ match]', match);

              // 동적 임계: 초단문이면 컷오프 완화
              const isShort = raw.trim().length <= 5;
              const cutoff = isShort ? 0.55 : 0.75;

              if (match && match.score >= cutoff) {
                const item = getFAQByIndex(match.index);
                if (item) {
                  faqCooldown.set(match.index, now);

                  // 등록된 답변 그대로 사용
                  let localized = item.answer ?? '';
                  // 혹시 앞에 디버그 JSON이 섞였으면 제거
                  localized = localized.replace(/^\s*\{[^}]*"score"[^}]*\}\s*/i, '');

                  // 원문 언어로 역번역 (한국어면 생략)
                  const answerIsKo = /[가-힣]/.test(localized);
                  if (!answerIsKo && srcLang !== agentLang) {
                    const back = await ai.getTranslator(agentLang, srcLang);
                    if (back) localized = await back.translate(localized);
                  }

                  // 페르소나 보정(존칭·끝말)
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

                  // DOC ID 출력(임시 요구사항)
                  try {
                    const { load } = await import('@/features/chatbot/ai/docIndex');
                    const idx = load();
                    const doc = idx.find((d: any) => d.id === (item as any).docId);
                    if (doc) {
                      localized += `\n\nDOC ID: ${doc.id}`;
                    } else if ((item as any).docId) {
                      localized += `\n\nDOC ID: ${(item as any).docId}`;
                    }
                  } catch {
                    if ((item as any).docId) {
                      localized += `\n\nDOC ID: ${(item as any).docId}`;
                    }
                  }

                  appendBot(localized);
                  return; // FAQ 종료
                }
              }
            }
          }
        } catch (e) {
          console.warn('[FAQ] routing failed, continue to docs/gen', e);
        }
      }

      // ===== FAQ 실패 시: 문서 인용 기반 생성 시도 =====
try {
  const { searchDocs } = await import('@/features/chatbot/ai/docSearch');
  const hits = await searchDocs(ai, raw);
  console.log('[docs hits]', hits);
  if (hits.length) {
    const hit = hits[0];

    // 0) 스니펫 정리
    const clean = (s: string) =>
      (s || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/[-–—•·◦◆▶■□※☆★◇]+/g, ' ')
        .replace(/[▁▂▃▄▅▆▇█━─═│┈┉┄┅]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const koSnippet = clean((hit as any).snippet || '');
    const titleKo   = clean(hit.title || '');

    // 1) 질의 언어로 직접 생성 (한국어면 한국어)
    const wantLang = srcLang;        // 질의 언어
    const agentLangNow = ai.agentLang ?? 'en';

    // 필요하면 스니펫/질의를 wantLang로 번역
    let ctx = koSnippet;
    let userQ = raw;
    if (wantLang !== 'ko') {
      // 한글 외 질의면 컨텍스트를 질의 언어로 통일
      const toWant = await ai.getTranslator('ko', wantLang);
      if (toWant) ctx = await toWant.translate(koSnippet);
    }

    const sys =
      wantLang.startsWith('ko')
        ? '한국어로 2~4문장, 350자 이내로 답해. 사실만 말해. 필요하면 "참고:"로 출처를 앞에 붙여.'
        : `Respond in ${wantLang}. Max 4 sentences, <=350 chars. Be factual. If citing, prefix with "Ref:".`;

    const ask = `${sys}\n질문: ${userQ}\n컨텍스트(문서 "${titleKo}"): ${ctx}\n답변:`;

    appendBot('…');
    let draft = '';
    for await (const chunk of ai.prompt.promptStream(ask)) {
      draft += chunk;
      if (draft.length >= 40 && draft.length % 20 === 0) replaceLastBot('생성 중…');
    }

    // 2) 역번역 금지: 질의 언어와 동일하면 그대로 사용
    let localized = draft.trim();

    // 3) 가비지 탐지 후 1회 재시도(영문 컨텍스트 -> ko 단번역)
    const isGarbageKo = (s: string) => {
      if (!wantLang.startsWith('ko')) return false;
      const noSpace = s.replace(/\s/g, '');
      const hangul = (noSpace.match(/[가-힣]/g) || []).length;
      return s.length < 8 || hangul / Math.max(1, noSpace.length) < 0.4;
    };

    if (isGarbageKo(localized)) {
      const toEn = await ai.getTranslator('ko', 'en');
      const enCtx = toEn ? await toEn.translate(koSnippet) : koSnippet;
      const enAsk =
        `Respond in English. Max 4 sentences, <=350 chars. Be factual. If citing, prefix with "Ref:".\n` +
        `User: ${raw}\nContext from "${titleKo}": ${enCtx}\nAgent:`;
      draft = '';
      for await (const chunk of ai.prompt.promptStream(enAsk)) draft += chunk;
      const back = await ai.getTranslator('en', 'ko');
      localized = back ? await back.translate(draft) : draft;
    }

    // 4) 길이·문장 제한 및 DOC ID 덧붙이기
    const sentenceClamp = (s: string) =>
      s.split(/(?<=[.!?。？！])\s+/).filter(Boolean).slice(0, 4).join(' ').trim();
    const cut = (s: string) => (s.length > 360 ? s.slice(0, 359) + '…' : s);
    localized = cut(sentenceClamp(localized));

    try {
      const { load } = await import('@/features/chatbot/ai/docIndex');
      const idx = load();
      const doc = idx.find((d: any) => d.id === (hit as any).articleId);
      localized += `\n\nDOC ID: ${doc ? doc.id : (hit as any).articleId}`;
    } catch {}

    replaceLastBot(localized);
    return;
  }
} catch (e) {
  console.warn('[docs search] skipped', e);
}


      // ===== 평소 모드: 페르소나 기반 생성 =====
      const sysRule = `Respond in ${agentLang}. No markdown. Max 4 sentences, <=350 chars.`;
      const promptInput = `${sysRule}\nUser: ${normalized}\nAgent:`;

      appendBot('…');
      let draft = '';
      let streamed = false;

      try {
        for await (const chunk of ai.prompt.promptStream(promptInput)) {
          streamed = true;
          draft += chunk;
          if (draft.length >= 40 && draft.length % 20 === 0) {
            replaceLastBot('생성 중…');
            await new Promise(r => setTimeout(r, 0));
          }
        }
      } catch (e) {
        console.warn('[stream]', e);
      } finally {
        if (!streamed || !draft.trim()) {
          replaceLastBot('응답을 생성하지 못했습니다.');
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
