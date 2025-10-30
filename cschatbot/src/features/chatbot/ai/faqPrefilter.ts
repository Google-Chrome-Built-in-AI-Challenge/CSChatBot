// src/features/chatbot/faqPrefilter.ts (업데이트)
type FAQItem = { question: string; answer: string; date: string; lang?: string; norm?: { enQ?: string; koQ?: string }; tags?: string[] };

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const tokenRegex = /[가-힣]+|[a-z0-9]+/gi;
const tokenize = (s: string) => (normalize(s).match(tokenRegex) ?? []);

function makeTagset(faq: FAQItem): Set<string> {
  const set = new Set<string>();
  (faq.tags ?? []).forEach(t => set.add(normalize(t)));
  if (!faq.tags?.length) {
    // 구버전 호환: 태그가 없으면 질문 토큰으로 대체
    tokenize(faq.question).forEach(t => set.add(t));
    if (faq.norm?.enQ) tokenize(faq.norm.enQ).forEach(t => set.add(t));
    if (faq.norm?.koQ) tokenize(faq.norm.koQ).forEach(t => set.add(t));
  }
  return set;
}

export type PrefilterHit = { index: number; overlap: number; jaccard: number };

export async function prefilterFAQ(rawUser: string, faqs: FAQItem[], translateToEn?: (s: string)=>Promise<string>): Promise<PrefilterHit[]> {
  if (!faqs.length) return [];

  // 유저 입력 토큰: 원문 + 영어 번역(가능하면)
  let userTokens = new Set(tokenize(rawUser));
  try {
    if (translateToEn) {
      const en = await translateToEn(rawUser);
      tokenize(en).forEach(t => userTokens.add(t));
    }
  } catch {}

  const hits: PrefilterHit[] = [];
  faqs.forEach((f, i) => {
    const tagset = makeTagset(f);
    let inter = 0;
    tagset.forEach(t => { if (userTokens.has(t)) inter++; });
    const union = new Set([...tagset, ...userTokens]).size || 1;
    const jac = inter / union;
    if (inter > 0 || jac >= 0.15) hits.push({ index: i, overlap: inter, jaccard: jac });
  });

  hits.sort((a, b) => b.overlap - a.overlap || b.jaccard - a.jaccard);
  return hits.slice(0, 5);
}
