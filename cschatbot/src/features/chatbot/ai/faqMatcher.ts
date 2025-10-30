// src/features/chatbot/faqMatcher.ts
type FAQItem = { question: string; answer: string; date: string; tags?: string[] };
export type FaqMatch = { index: number; score: number } | null;

const loadFAQ = (): FAQItem[] => {
  try {
    return JSON.parse(localStorage.getItem("faqList") || "[]");
  } catch { return []; }
};

const buildPromptNarrow = (userQ_en: string, subset: {i:number; q:string; a:string}[]) => {
  const list = subset.map(s => `#${s.i}\nQ: ${s.q}\nA: ${s.a}`).join("\n\n");
  return [
    "You are an intent matcher. Compare USER question with the shortlist of FAQs.",
    "Choose the single best by semantic intent, tolerant to paraphrase.",
    "Return ONLY JSON: {\"index\": <number>, \"score\": <0..1>}",
    "If none is suitable (score < 0.75), return {\"index\": -1, \"score\": 0.0}.",
    "",
    "FAQ SHORTLIST:",
    list,
    "",
    `USER: ${userQ_en}`,
    "RESULT JSON:"
  ].join("\n");
};

export async function matchFAQFromShortlist(
  promptAPI: { prompt: (s: string) => Promise<string> },
  userQ_en: string,
  shortlistIdx: number[]
): Promise<FaqMatch> {
  const faqs = loadFAQ();
  if (!faqs.length || !shortlistIdx.length) return null;

  const subset = shortlistIdx.map(i => ({ i, q: faqs[i].question, a: faqs[i].answer }));
  const raw = await promptAPI.prompt(buildPromptNarrow(userQ_en, subset));
  const json = (raw || "").trim().match(/\{[\s\S]*\}$/)?.[0] ?? raw;

  try {
    const parsed = JSON.parse(json) as { index: number; score: number };
    if (parsed.index == null || parsed.score == null) return null;
    if (parsed.index < 0) return { index: -1, score: 0 };
    return parsed;
  } catch {
    return null;
  }
}

export function getFAQ(i: number): FAQItem | null {
  const faqs = loadFAQ();
  return faqs[i] ?? null;
}
