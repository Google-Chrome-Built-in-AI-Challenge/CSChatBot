import persona from '../data/personas/acme.json';
import glossary from '../data/glossary/acme.json';
import faq from '../data/faq/acme.json';

import { ensurePromptAvailable, createPromptSession } from './prompt';
import { ensureWriterAvailable, createWriter } from './writer';
import { ensureTranslatorAvailable, createTranslator } from './translator';
import { ensureLangDetectorAvailable, createLangDetector } from './langdetector';

// ★ 최종 표시 언어 고정: 한국어
export const DISPLAY_LANG = 'ko';

export async function bootstrapLocalAI(
  onProgress?: (k: 'langdet' | 'writer' | 'translator', r: number) => void
) {
  console.log('[Bootstrap] start with persona:', persona);

  let langAvail:any;
  try { langAvail = await ensureLangDetectorAvailable(); } catch (e) { console.error('[Bootstrap] LangDet ensure failed:', e); }

  let writerAvail:any, promptAvail:any;
  try { writerAvail = await ensureWriterAvailable(); } catch (e) { console.error('[Bootstrap] Writer ensure failed:', e); }
  try { promptAvail = await ensurePromptAvailable(); } catch (e) { console.error('[Bootstrap] Prompt ensure failed:', e); }

  console.log('[Bootstrap] avail:', { langAvail, writerAvail, promptAvail });

  let detector:any = null;
  let writer:any = null;
  let prompt:any = null;

  // 1) LanguageDetector
  try {
    detector = await createLangDetector({ onProgress: r => onProgress?.('langdet', r) });
  } catch (e) {
    console.error('[Bootstrap] LangDet create failed:', e);
  }

  // 2) Writer: 짧고 담백, 프레인텍스트, 출력은 en(내부 맵) 고정
  try {
    writer = await createWriter({
      tone: 'neutral',
      format: 'plain-text',
      length: 'short',
      sharedContext: `Tone=${(persona as any).tone}; Avoid=${(persona as any).forbiddenPhrases?.join(', ')}`,
      outputLanguage: (persona as any).agentLang ?? 'en',
      onProgress: r => onProgress?.('writer', r),
    });
  } catch (e) {
    console.error('[Bootstrap] Writer create failed:', e);
  }

  // 3) Prompt 세션
  try {
    prompt = await createPromptSession({
      initialPrompts: (persona as any).initialPrompts,
      expectedInputs:  [{ type: 'text', languages: [(persona as any).agentLang ?? 'en'] }],
      expectedOutputs: [{ type: 'text', languages: [(persona as any).agentLang ?? 'en'] }],
    });
  } catch (e) {
    console.error('[Bootstrap] Prompt create failed:', e);
  }

  // 4) 번역기 헬퍼: from -> to 어떤 조합이든 생성
  const getTranslator = async (from: string, to: string) => {
    if (from === to) return null;
    await ensureTranslatorAvailable({ sourceLanguage: from, targetLanguage: to });
    return await createTranslator(
      { sourceLanguage: from, targetLanguage: to },
      { onProgress: r => onProgress?.('translator', r) }
    );
  };

  // 5) 입력 언어 → agent 언어(영어) 변환용 팩토리
  const translatorFactory = async (sourceLang: string) =>
    sourceLang === (persona as any).agentLang ? null : getTranslator(sourceLang, (persona as any).agentLang ?? 'en');

  console.log('[Bootstrap] created:', { detector: !!detector, writer: !!writer, prompt: !!prompt });

  if (!detector || !prompt) {
    const missing = [
      !detector && 'LanguageDetector',
      !prompt && 'Prompt',
      !writer && '(Writer optional)',
    ].filter(Boolean).join(', ');
    throw new Error(`[Bootstrap] missing instances: ${missing}`);
  }

  return { detector, translatorFactory, getTranslator, writer, prompt, persona, glossary, faq, displayLang: DISPLAY_LANG };
}
