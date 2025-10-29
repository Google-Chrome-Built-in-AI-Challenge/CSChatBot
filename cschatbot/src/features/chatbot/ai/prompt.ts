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
  // 낮은 온도/탑K로 속도+일관성 확보
  const params = await (async () => {
    // @ts-ignore
    const p = await LanguageModel.params?.().catch(()=>null);
    return p ?? { defaultTemperature: 1, defaultTopK: 3 };
  })();

  const temperature = Math.min(1, (opts?.temperature ?? params.defaultTemperature * 0.7));
  const topK = Math.max(1, (opts?.topK ?? 1)); // 가능한 낮게

  console.time('[Prompt.create] time');
  // @ts-ignore
  const session = await LanguageModel.create({
    initialPrompts: opts?.initialPrompts,
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
