// src/features/chatbot/ai/prompt.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';

export type Avail = 'available'|'downloadable'|'unavailable';

export async function ensurePromptAvailable(): Promise<Avail> {
  const has = 'LanguageModel' in self;
  console.log('[Prompt.ensure] feature(LanguageModel):', has);
  if (!has) throw new UnsupportedFeatureError('Prompt API unsupported: LanguageModel missing');

  // @ts-ignore
  try {
    const avail = await LanguageModel.availability();
    console.log('[Prompt.ensure] availability:', avail);
    return avail;
  } catch (e) {
    console.error('[Prompt.ensure] availability() threw:', e);
    throw e;
  }
}

export async function createPromptSession(opts?: {
  initialPrompts?: Array<{ role:'system'|'user'|'assistant'; content:string }>;
  expectedInputs?: Array<{ type:'text'|'image'|'audio'; languages:string[] }>;
  expectedOutputs?: Array<{ type:'text'; languages:string[] }>;
  signal?: AbortSignal;
}) {
  // @ts-ignore
  try {
    console.time('[Prompt.create] time');
    const session = await LanguageModel.create({
      initialPrompts: opts?.initialPrompts,
      expectedInputs: opts?.expectedInputs,
      expectedOutputs: opts?.expectedOutputs,
      signal: opts?.signal
    });
    console.timeEnd('[Prompt.create] time');
    console.log('[Prompt.create] success');
    return {
      prompt: async (input: any, o?: { signal?: AbortSignal }) => {
        console.time('[Prompt.prompt] time');
        const res = await session.prompt(input, { signal: o?.signal });
        console.timeEnd('[Prompt.prompt] time');
        console.log('[Prompt.prompt] ok, len=', String(res)?.length ?? -1);
        return res;
      },
      destroy: () => {
        console.log('[Prompt.destroy]');
        session.destroy();
      }
    };
  } catch (e) {
    console.error('[Prompt.create] failed:', e);
    throw e;
  }
}
