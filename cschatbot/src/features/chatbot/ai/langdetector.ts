// src/features/chatbot/ai/langDetector.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';
export type Avail = 'available'|'downloadable'|'unavailable';

export async function ensureLangDetectorAvailable(): Promise<Avail> {
  const has = 'LanguageDetector' in self;
  console.log('[LangDet.ensure] feature(LanguageDetector):', has);
  if (!has) throw new UnsupportedFeatureError('Language Detector API unsupported');
  // @ts-ignore
  const avail = await LanguageDetector.availability();
  console.log('[LangDet.ensure] availability:', avail);
  return avail;
}

export async function createLangDetector(opts?:{
  onProgress?:(r:number)=>void; signal?:AbortSignal;
}) {
  try {
    console.time('[LangDet.create] time');
    // @ts-ignore
    const det = await LanguageDetector.create({
      monitor(m:any){
        m?.addEventListener?.('downloadprogress', (e:any)=>{
          const r = e?.loaded ?? 0;
          console.log('[LangDet.download]', Math.round(r*100), '%');
          opts?.onProgress?.(r);
        });
      },
      signal: opts?.signal
    });
    console.timeEnd('[LangDet.create] time');
    console.log('[LangDet.create] success');
    return {
      detect: async (text:string) => {
        const results = await det.detect(text);
        const top = results?.[0];
        console.log('[LangDet.detect] top:', top);
        return top?.detectedLanguage ?? null;
      }
    };
  } catch (e) {
    console.error('[LangDet.create] failed:', e);
    throw e;
  }
}
