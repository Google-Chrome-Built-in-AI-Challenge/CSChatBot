import { UnsupportedFeatureError } from '../lib/aiErrors';

export type Avail = 'available'|'downloadable'|'unavailable';

export async function ensureTranslatorAvailable(opts: {
  sourceLanguage: string; targetLanguage: string;
}) {
  console.log('[Translator.ensure] feature(Translator):', 'Translator' in self, 'pair=', opts);
  if (!('Translator' in self)) throw new UnsupportedFeatureError('Translator API unsupported');
  // @ts-ignore
  const avail = await Translator.availability(opts);
  console.log('[Translator.ensure] availability:', avail);
  return avail as Avail;
}

export async function createTranslator(
  opts: { sourceLanguage: string; targetLanguage: string; },
  hooks?: { onProgress?: (r:number)=>void }
) {
  console.time('[Translator.create] time');
  // @ts-ignore
  const tr = await Translator.create({
    sourceLanguage: opts.sourceLanguage,
    targetLanguage: opts.targetLanguage,
    monitor(m:any){
      m?.addEventListener?.('downloadprogress', (e:any)=>{
        const r = e?.loaded ?? 0;
        console.log('[Translator.download]', Math.round(r*100), '%');
        hooks?.onProgress?.(r);
      });
    }
  });
  console.timeEnd('[Translator.create] time');
  console.log('[Translator.create] success', opts);

  return {
    translate: async (text: string) => {
      console.time('[Translator.translate] time');
      // @ts-ignore
      const out = await tr.translate(text);
      console.timeEnd('[Translator.translate] time');
      return out as string;
    },
    translateStream: async function* (text: string) {
      // 스트리밍 지원 안 하면 실패할 수 있음. 그때는 호출 측에서 폴백.
      // @ts-ignore
      const stream = tr.translateStreaming?.(text);
      if (!stream || !stream[Symbol.asyncIterator]) throw new Error('no-stream');
      for await (const chunk of stream) yield chunk;
    }
  };
}
