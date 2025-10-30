// prompt.ts
import { UnsupportedFeatureError } from '../lib/aiErrors';

export type Avail = 'available'|'downloadable'|'unavailable';

export async function ensurePromptAvailable(): Promise<Avail> {
  const has = 'LanguageModel' in self;
  console.log('[Prompt.ensure] feature(LanguageModel):', has);
  if (!has) throw new UnsupportedFeatureError('Prompt API unsupported: LanguageModel missing');
  // @ts-ignore
  const avail = await LanguageModel.availability();
  console.log('[Prompt.ensure] availability:', avail);
  return avail;
}

type LMOpts = {
  initialPrompts?: Array<{ role:'system'|'user'|'assistant'; content:string }>;
  expectedInputs?: Array<{ type:'text'|'image'|'audio'; languages:string[] }>;
  expectedOutputs?: Array<{ type:'text'; languages:string[] }>;
  signal?: AbortSignal;
  temperature?: number;
  topK?: number;
};

export async function createPromptSession(opts?: LMOpts) {
  const params = await (async () => {
    // @ts-ignore
    const p = await LanguageModel.params?.().catch(() => null);
    return p ?? { defaultTemperature: 1, defaultTopK: 3 };
  })();

  const temperature = Math.min(1, (opts?.temperature ?? params.defaultTemperature * 0.7));
  const topK = Math.max(1, (opts?.topK ?? 1));

  // // system prompt가 항상 첫 번째에 오도록 정리
  // const systemPrompt = {
  //   role: 'system',
  //   content: [
  //     'You are a helpful assistant.',
  //     'No markdown.',
  //     opts?.meta?.noMarkdown ? 'Do not use markdown.' : '',
  //     opts?.meta?.maxSentences ? `Use at most ${opts.meta.maxSentences} sentences.` : '',
  //     opts?.meta?.maxChars ? `Keep it under ${opts.meta.maxChars} characters.` : '',
  //   ].filter(Boolean).join(' ')
  // };

  // const initPrompts = [systemPrompt, ...(opts?.initialPrompts ?? [])];
  const initPrompts = opts?.initialPrompts ?? [];
  
  console.time('[Prompt.create] time');
  // @ts-ignore
  const session = await LanguageModel.create({
    initialPrompts: initPrompts, // ★ system이 항상 맨 앞
    expectedInputs: opts?.expectedInputs,
    expectedOutputs: opts?.expectedOutputs,
    temperature,
    topK,
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
    promptStream: async function* (input: any, o?: { signal?: AbortSignal }) {
      // @ts-ignore
      const stream = session.promptStreaming(input, { signal: o?.signal });
      for await (const chunk of stream) yield chunk;
    },
    destroy: () => session.destroy()
  };
}

