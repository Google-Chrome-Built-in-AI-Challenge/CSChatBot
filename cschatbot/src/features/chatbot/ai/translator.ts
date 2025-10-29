// src/features/chatbot/ai/translator.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';
import type { Avail } from './prompt';

// src/features/chatbot/ai/translator.ts
export async function ensureTranslatorAvailable(opts: {
  sourceLanguage: string; targetLanguage: string;
}) {
  console.log('[Translator.ensure] feature(Translator):', 'Translator' in self, 'pair=', opts);
  if (!('Translator' in self)) throw new Error('Translator missing');
  // @ts-ignore
  const avail = await Translator.availability(opts);
  console.log('[Translator.ensure] availability:', avail);
  return avail as 'available'|'downloadable'|'unavailable';
}

export async function createTranslator(opts: {
  sourceLanguage: string; targetLanguage: string; onProgress?: (r:number)=>void;
}) {
  try {
    console.time('[Translator.create] time');
    // @ts-ignore
    const tr = await Translator.create({
      sourceLanguage: opts.sourceLanguage,
      targetLanguage: opts.targetLanguage,
      monitor(m:any){
        m?.addEventListener?.('downloadprogress', (e:any)=>{
          const r = e?.loaded ?? 0;
          console.log('[Translator.download]', Math.round(r*100), '%');
          opts.onProgress?.(r);
        });
      }
    });
    console.timeEnd('[Translator.create] time');
    console.log('[Translator.create] success', { sourceLanguage: opts.sourceLanguage, targetLanguage: opts.targetLanguage });

    return {
      translate: async (text: string) => {
        console.time('[Translator.translate] time');
        // @ts-ignore
        const out = await tr.translate(text);
        console.timeEnd('[Translator.translate] time');
        console.log('[Translator.translate] ok, inLen=', text.length, 'outLen=', String(out).length);
        return out as string;
      }
    };
  } catch (e) {
    console.error('[Translator.create] failed:', e);
    throw e;
  }
}
