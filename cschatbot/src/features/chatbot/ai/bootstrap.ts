import persona from '../data/personas/acme.json';
import glossary from '../data/glossary/acme.json';
import faq from '../data/faq/acme.json';

import { ensurePromptAvailable, createPromptSession } from './prompt';
import { ensureWriterAvailable, createWriter } from './writer';
import { ensureTranslatorAvailable, createTranslator } from './translator';
import { ensureLangDetectorAvailable, createLangDetector } from './langdetector';

const WRITER_ON = false; // ★ 우선 끄고 시작. 느리면 바로 범인임.

export async function bootstrapLocalAI(
  onProgress?: (k: 'langdet' | 'writer' | 'translator', r: number) => void
) {
  console.log('[Bootstrap] start with persona:', persona);

  const agentLang = (persona as any).agentLang ?? 'en';

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

  const prompt = await createPromptSession({
    initialPrompts: (persona as any).initialPrompts, // 길면 줄이자
    expectedInputs: [{ type: 'text', languages: [agentLang] }],
    expectedOutputs: [{ type: 'text', languages: [agentLang] }],
    temperature: 0.7,
    topK: 1
  }).catch(e => (console.error('[Bootstrap] Prompt create failed:', e), null));

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
