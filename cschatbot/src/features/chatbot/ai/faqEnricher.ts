// src/features/chatbot/faqEnricher.ts
import { bootstrapLocalAI } from "../ai/bootstrap";
import type { FAQItem } from "@/features/chatbot/ai/types";

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const tokenRegex = /[가-힣]+|[a-z0-9]+/gi;

function tokenize(s: string): string[] {
  const n = normalize(s);
  const toks = n.match(tokenRegex) ?? [];
  // 초간단 한국어 접미 제거 흉내 (완벽 X, 비용 절감용)
  return toks.map((t) =>
    t.replace(
      /(입니다|합니다|해요|했어요|하고|이면|이면요|인가요|할래요|해주세요|해줘)$/g,
      ""
    )
  );
}

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function extractIntentKeywords(ai: any, english: string): Promise<string[]> {
  try {
    const prompt =
      `List 5–8 short intent keywords (lowercase, no punctuation) for the user question:\n` +
      `Q: ${english}\nReturn only comma-separated words.`;
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

/**
 * 저장 전에 호출해서 enriched FAQItem을 돌려줌
 * 원문 질문/답변은 그대로, 검색용 태그만 생성
 */
export async function enrichFAQItem(
  rawQ: string,
  rawA: string,
  extra?: { docId?: string; docAnchor?: string }
): Promise<FAQItem> {
  const ai = await bootstrapLocalAI(() => {}, { companyId: "mari" });

  // 1) 언어 감지 (한글 있으면 ko 우선)
  let lang = "en";
  try {
    const clean = rawQ.slice(0, 200);
    const list = await ai.detector.detect(clean);
    const top = Array.isArray(list) ? list[0] : list;
    const hasHangul = /[가-힣]/.test(rawQ);
    lang = hasHangul ? "ko" : top?.detectedLanguage ?? "en";
  } catch {
    if (/[가-힣]/.test(rawQ)) lang = "ko";
  }

  // 2) 번역 캐시 확보
  let enQ = rawQ;
  let koQ = rawQ;
  try {
    if (!lang.startsWith("en")) {
      const t = await ai.getTranslator(lang, "en");
      enQ = t ? await t.translate(rawQ) : rawQ;
    }
    if (!lang.startsWith("ko")) {
      const t = await ai.getTranslator(lang, "ko");
      koQ = t ? await t.translate(rawQ) : rawQ;
    }
  } catch {
    // 번역 실패 시 원문 그대로 유지
  }

  // 3) 태그 생성: 원문 + en + ko 토큰
  const baseTags = [...tokenize(rawQ), ...tokenize(enQ), ...tokenize(koQ)];

  // 4) 의도 키워드(영어) 추가
  const intentTags = await extractIntentKeywords(ai, enQ);

  const tags = uniq([...baseTags, ...intentTags])
    .filter((w) => w.length >= 2)
    .slice(0, 64);

  // 5) FAQItem 반환 — answer는 절대 수정하지 않음
  return {
    question: rawQ.trim(),
    answer: rawA.trim(), // 원문 그대로
    date: new Date().toLocaleString(),
    lang: lang ?? "en",
    norm: { enQ, koQ },
    docId: extra?.docId,
    docAnchor: extra?.docAnchor,
    tags,
  };
}
