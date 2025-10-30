// src/features/chatbot/faqEnricher.ts
import { bootstrapLocalAI } from "../ai/bootstrap";

export interface FAQItem {
  question: string;
  answer: string;
  date: string;
  // 아래는 저장 시 자동 생성되는 필드
  lang?: string;            // 원문의 언어 추정
  norm?: { enQ?: string; koQ?: string }; // 대표질문 번역 캐시
  tags?: string[];          // 멀티랭 태그
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const tokenRegex = /[가-힣]+|[a-z0-9]+/gi;

function tokenize(s: string): string[] {
  const n = normalize(s);
  const toks = n.match(tokenRegex) ?? [];
  // 초간단 한국어 접미 제거 흉내 (완벽 X, 비용 절감용)
  return toks.map(t =>
    t.replace(/(입니다|합니다|해요|했어요|하고|이면|이면요|인가요|할래요|해주세요|해줘)$/g, "")
  );
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function extractIntentKeywords(ai: any, english: string): Promise<string[]> {
  try {
    const prompt =
      `List 5-8 short intent keywords (lowercase, no punctuation) for the user question:\n` +
      `Q: ${english}\n` +
      `Return as comma-separated words only.`;
    const out = await ai.prompt.prompt(prompt);
    return out
      .toLowerCase()
      .replace(/[^a-z0-9, ]/g, "")
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 12);
  } catch {
    return [];
  }
}

/** 저장 전에 호출해서 enriched FAQItem을 돌려줌 */
export async function enrichFAQItem(rawQ: string, rawA: string): Promise<FAQItem> {
  const ai = await bootstrapLocalAI(() => {}, { companyId: "mari" });

  // 1) 언어 감지
  let lang = "en";
  try {
    const clean = rawQ.slice(0, 200);
    const list = await ai.detector.detect(clean);
    const top = Array.isArray(list) ? list[0] : list;
    if (top?.detectedLanguage) lang = top.detectedLanguage;
  } catch {}

  // 2) 번역 캐시 확보
  let enQ = rawQ, koQ = rawQ;
  try {
    if (!lang.startsWith("en")) {
      const t = await ai.getTranslator(lang, "en");
      enQ = t ? await t.translate(rawQ) : rawQ;
    }
    if (!lang.startsWith("ko")) {
      const t = await ai.getTranslator(lang, "ko");
      koQ = t ? await t.translate(rawQ) : rawQ;
    }
  } catch {}

  // 3) 태그 생성: 원문 + en + ko 토큰
  const baseTags = [
    ...tokenize(rawQ),
    ...tokenize(enQ),
    ...tokenize(koQ)
  ];

  // 4) 의도 키워드(영어) 추가
  const intentTags = await extractIntentKeywords(ai, enQ);

  const tags = uniq([...baseTags, ...intentTags])
    .filter(w => w.length >= 2)           // 너무 짧은 토큰 제거
    .slice(0, 64);                        // 태그 길이 상한

  return {
    question: rawQ,
    answer: rawA,
    date: new Date().toLocaleString(),
    lang,
    norm: { enQ, koQ },
    tags
  };
}
