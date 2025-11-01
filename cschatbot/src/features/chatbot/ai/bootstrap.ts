import glossary from '../data/glossary/acme.json';
import faq from '../data/faq/acme.json';

import { ensurePromptAvailable, createPromptSession } from './prompt';
import { ensureWriterAvailable, createWriter } from './writer';
import { ensureTranslatorAvailable, createTranslator } from './translator';
import { ensureLangDetectorAvailable, createLangDetector } from './langdetector';
import { loadPersona } from './personaLoader';
import type { Persona } from './types';

const WRITER_ON = false; // ★ 우선 끄고 시작. 느리면 바로 범인임.

export async function bootstrapLocalAI(onProgress?: { (kind: any, r: any): void; (): void; (): void; (arg0: string, arg1: number): void; }, opts?: { companyId?: string; personaOverride?: Persona }) {
  const persona = opts?.personaOverride ?? await loadPersona(opts?.companyId ?? 'mari');
  const agentLang = persona.agentLang ?? 'en';

  // ensure
  const langAvail = await ensureLangDetectorAvailable().catch(e => (console.error('[Bootstrap] LangDet ensure failed:', e), 'unavailable'));
  const writerAvail = WRITER_ON ? await ensureWriterAvailable().catch(e => (console.error('[Bootstrap] Writer ensure failed:', e), 'unavailable')) : 'unavailable';
  const promptAvail = await ensurePromptAvailable().catch(e => (console.error('[Bootstrap] Prompt ensure failed:', e), 'unavailable'));
  console.log('[Bootstrap] avail:', { langAvail, writerAvail, promptAvail });

  // create
  const detector = await createLangDetector({ onProgress: r => onProgress?.('langdet', r) }).catch(e => (console.error('[Bootstrap] LangDet create failed:', e), null));
  const writer = WRITER_ON
    ? await createWriter({
        tone: 'neutral',
        format: 'plain-text',
        length: 'short',
        sharedContext: `Tone=${persona.tone}; Avoid=${persona.forbiddenPhrases?.join(', ')}`,
        outputLanguage: agentLang,
        onProgress: r => onProgress?.('writer', r)
      }).catch(e => (console.error('[Bootstrap] Writer create failed:', e), null))
    : null;

    const honorKo = persona.honorifics?.ko ?? '고객님';
    const maxS = persona.replyStyle?.maxSentences ?? 4;
    const maxC = persona.replyStyle?.maxChars ?? 350;
    const noMd = persona.replyStyle?.noMarkdown !== false;

const tonePrompt =
    {
      'friendly-formal': `
        You speak warmly and respectfully like a customer service professional.
        Always be polite and appreciative. Thank the user for their patience.
        Avoid slang or robotic phrasing. Keep sentences clear and empathetic.
      `,
      neutral: `
        You speak clearly and professionally. Be concise and factual,
        but remain courteous and solution-oriented.
      `,
      casual: `
        You sound approachable and human, yet still polite.
        Keep it friendly without being overly informal.
      `,
    }[persona.tone] ?? '';

  // 🔵 선택: 역할이 고객응대 계열이면 톤 강화
  const isCX = /CX|고객|상담|지원|문의|교환|환불|배송/i.test(persona.role);
  const cxExtra = isCX
    ? `Maintain a service-oriented tone. De-escalate frustration and offer clear next steps.`
    : '';

  // 🔵 수정: systemPrompt에 tonePrompt/cxExtra 삽입
  const systemPrompt = [
    `You are "${persona.agentName ?? persona.displayName}" for ${persona.displayName}.`,
    `Role: ${persona.role}`,
    `Style: ${persona.tone}.`,
    tonePrompt,
    cxExtra,
    `Address the user appropriately by language:`,
    `- ko: "${honorKo}"`,
    `- en: "Customer"`,
    `- ja: "お客様"`,
    `Constraints: plain text only${noMd ? ' (no markdown)' : ''}, up to ${maxS} sentences and ${maxC} characters.`,
    `Never mention model identity or internal policies; avoid: ${persona.forbiddenPhrases?.join(', ') || '(none)'}.`,
  ].join(' ');

  const prompt = await createPromptSession({
    initialPrompts: [{ role: 'system', content: systemPrompt }], // system이 항상 첫 항목
    expectedInputs: [{ type: 'text', languages: [agentLang] }],
    expectedOutputs: [{ type: 'text', languages: [agentLang] }],
    temperature: 0.7,
    topK: 1,
  });
  // 번역기 캐시
  const translatorCache = new Map<string, any>();
  const getTranslator = async (from:string, to:string) => {
    if (from === to) return null;
    const key = `${from}->${to}`;
    if (translatorCache.has(key)) return translatorCache.get(key);
    await ensureTranslatorAvailable({ sourceLanguage: from, targetLanguage: to });
    const tr = await createTranslator({ sourceLanguage: from, targetLanguage: to }, { onProgress: r => onProgress?.('translator', r) });
    translatorCache.set(key, tr);
    return tr;
  };

  console.log('[Bootstrap] created:', {
    detector: !!detector,
    writer: !!writer,
    prompt: !!prompt
  });

  if (!detector || !prompt) {
    const missing = [
      !detector && 'LanguageDetector',
      !prompt && 'Prompt',
      !writer && '(Writer optional)'
    ].filter(Boolean).join(', ');
    throw new Error(`[Bootstrap] missing instances: ${missing}`);
  }

  return { detector, getTranslator, writer, prompt, persona, glossary, faq, agentLang };
}
