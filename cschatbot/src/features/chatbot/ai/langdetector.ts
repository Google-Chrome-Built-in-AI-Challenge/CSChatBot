// src/features/chatbot/ai/langdetector.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';
export type Avail = 'available' | 'downloadable' | 'unavailable';

export async function ensureLangDetectorAvailable(): Promise<Avail> {
  const has = 'LanguageDetector' in self;
  console.log('[LangDet.ensure] feature(LanguageDetector):', has);
  if (!has) throw new UnsupportedFeatureError('LanguageDetector API unsupported');
  // @ts-ignore
  const avail = await LanguageDetector.availability();
  console.log('[LangDet.ensure] availability:', avail);
  return avail as Avail;
}

export async function createLangDetector(opts?: { onProgress?: (r: number) => void }) {
  console.time('[LangDet.create] time');
  // @ts-ignore
  const det = await LanguageDetector.create({
    monitor(m: any) {
      m?.addEventListener?.('downloadprogress', (e: any) => {
        const r = e?.loaded ?? 0;
        console.log('[LangDet.download]', Math.round(r * 100), '%');
        opts?.onProgress?.(r);
      });
    },
  });
  console.timeEnd('[LangDet.create] time');
  console.log('[LangDet.create] success');

  async function normalize(out: any) {
    // 항상 배열을 돌려주자
    if (Array.isArray(out)) return out;
    if (out && out[Symbol.asyncIterator]) {
      const acc: any[] = [];
      for await (const item of out) acc.push(item);
      return acc;
    }
    if (out?.detectedLanguage) return [out];
    return [];
  }

  return {
    // ✅ 반드시 반환할 것
    async detect(text: string) {
      // @ts-ignore
      const raw = await det.detect(text);
      const arr = await normalize(raw);
      console.log('[LangDet.detect] top:', arr[0]);
      return arr; // ★ 이 한 줄이 네가 잃어버린 조각
    },
    async detectTop(text: string) {
      const arr = await this.detect(text);
      return arr?.[0] ?? null;
    },
  };
}
