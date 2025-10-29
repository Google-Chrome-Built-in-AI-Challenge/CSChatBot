// src/features/chatbot/ai/writer.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';
import type { Avail } from './prompt';

const WRITER_SUPPORTED = ['en', 'es', 'ja'] as const;
type WriterLang = typeof WRITER_SUPPORTED[number];

function toWriterLang(lang?: string): WriterLang {
  const l = (lang ?? 'en').toLowerCase();
  return (WRITER_SUPPORTED as readonly string[]).includes(l) ? (l as WriterLang) : 'en';
}

export async function ensureWriterAvailable(): Promise<Avail> {
  const has = 'Writer' in self;
  console.log('[Writer.ensure] feature(Writer):', has);
  if (!has) throw new UnsupportedFeatureError('Writer API unsupported: Writer missing');
  // @ts-ignore
  const avail = await Writer.availability();
  console.log('[Writer.ensure] availability:', avail);
  return avail;
}

export async function createWriter(opts?: {
  tone?: 'formal'|'neutral'|'casual';
  format?: 'markdown'|'plain-text';
  length?: 'short'|'medium'|'long';
  sharedContext?: string;
  outputLanguage?: string; // 아무거나 받아도 내부에서 지원셋으로 맵핑
  onProgress?: (r:number)=>void;
  signal?: AbortSignal;
}) {
  try {
    const out = toWriterLang(opts?.outputLanguage); // ★ 지원셋으로 강제 맵핑
    console.time('[Writer.create] time');
    // @ts-ignore
    const writer = await Writer.create({
      tone: opts?.tone ?? 'neutral',
      format: opts?.format ?? 'markdown',
      length: opts?.length ?? 'medium',
      expectedInputLanguages: [out],      // ★ 한 종만
      expectedContextLanguages: [out],    // ★ 한 종만
      outputLanguage: out,                // ★ 반드시 지정
      monitor(m:any){
        m?.addEventListener?.('downloadprogress', (e:any)=>{
          const r = e?.loaded ?? 0;
          console.log('[Writer.download]', Math.round(r*100), '%');
          opts?.onProgress?.(r);
        });
      },
      signal: opts?.signal
    });
    console.timeEnd('[Writer.create] time');
    console.log('[Writer.create] success (out=%s)', out);

    return {
      write: async (prompt: string, o?: { context?: string; signal?: AbortSignal }) => {
        console.time('[Writer.write] time');
        const res = await writer.write(prompt, { context: o?.context, signal: o?.signal });
        console.timeEnd('[Writer.write] time');
        console.log('[Writer.write] ok, len=', String(res)?.length ?? -1);
        return res;
      },
      destroy: () => {
        console.log('[Writer.destroy]');
        writer.destroy();
      }
    };
  } catch (e) {
    console.error('[Writer.create] failed:', e);
    throw e;
  }
}
