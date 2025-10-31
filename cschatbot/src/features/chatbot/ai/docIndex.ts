// src/features/ai/docIndex.ts
import type { Article } from "@/features/views/Docs"; // 없으면 동일 타입 로컬 선언

const STORAGE_KEY = "docIndex:v1";

type DocChunk = {
  id: string; articleId: string;
  heading?: string;
  text: string; text_en: string;
  keywords_en: string[];
  scoreHint?: number;
};

type DocIndexEntry = {
  id: string; title: string; title_en: string;
  summary_en: string; keywords_en: string[];
  chunks: DocChunk[]; updatedAt: number;
};

export type DocIndex = DocIndexEntry[];

const save = (idx: DocIndex) => localStorage.setItem(STORAGE_KEY, JSON.stringify(idx));
export const load = (): DocIndex => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};

const splitIntoChunks = (md: string, articleId: string): { heading?: string; text: string }[] => {
  // 매우 단순: heading 기준 덩어리 → 길면 500~800자 근처로 쪼개기
  const lines = md.split(/\r?\n/);
  const out: { heading?: string; text: string }[] = [];
  let curHead: string | undefined = undefined;
  let buf: string[] = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) out.push({ heading: curHead, text });
    buf = [];
  };
  for (const ln of lines) {
    const m = ln.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/);
    if (m) { flush(); curHead = m[1].trim(); continue; }
    buf.push(ln);
    if (buf.join("\n").length > 900) flush();
  }
  flush();
  // 자잘한 공백 조정
  return out.map(x => ({ ...x, text: x.text.replace(/\n{3,}/g, "\n\n") }));
};

const simpleKeywordExtract = (text_en: string, limit = 12): string[] => {
  // 방어적 폴백: stopwords 대충 빼고 상위 n개
  const stop = new Set("the a an and or is are was were be been being to for of on in with at from as by it this that these those you your we our they their".split(/\s+/));
  const freq: Record<string, number> = {};
  for (const w0 of text_en.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
    if (w0.length <= 2 || stop.has(w0)) continue;
    freq[w0] = (freq[w0] ?? 0) + 1;
  }
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([w])=>w);
};

export async function compileIndex(ai: any, articles: Article[]): Promise<DocIndex> {
  const tToEn = async (s: string) => {
    const det = (await ai.detector?.detect?.(s))?.[0];
    const src = det?.detectedLanguage ?? "en";
    if (src.startsWith("en")) return s;
    const tr = await ai.getTranslator(src, "en");
    return tr ? await tr.translate(s) : s;
  };

  // 키워드/요약은 내장 프롬프트를 활용. 실패 시 폴백.
  const promptKeywords = async (textEn: string): Promise<string[]> => {
    const ask = `Extract 8-14 concise domain keywords from the text. Lowercase. Comma-separated. No duplicates.\nText:\n${textEn}\nKeywords:`;
    try {
      let out = "";
      for await (const chunk of ai.prompt.promptStream(ask)) out += chunk;
      return out.split(/[,\n]/).map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0, 14);
    } catch { return simpleKeywordExtract(textEn, 12); }
  };

  const promptSummary = async (textEn: string): Promise<string> => {
    const ask = `Summarize in 2 sentences (<=240 chars total), plain English, no markdown:\n${textEn}\nSummary:`;
    try {
      let out = ""; for await (const c of ai.prompt.promptStream(ask)) out += c;
      return out.replace(/\s+/g, " ").trim().slice(0, 260);
    } catch {
      return textEn.split(/\.\s+/).slice(0,2).join(". ").slice(0, 260);
    }
  };

  const out: DocIndex = [];
  for (const a of articles) {
    const chunksRaw = splitIntoChunks(a.content, a.id);
    const title_en = await tToEn(a.title);
    // 텍스트 너무 길면 요약에만 투입
    const previewForSummary = chunksRaw.slice(0, 4).map(c=>c.text).join("\n\n").slice(0, 4000);
    const preview_en = await tToEn(previewForSummary);

    const chunks: DocChunk[] = [];
    for (let i=0;i<chunksRaw.length;i++) {
      const r = chunksRaw[i];
      const text_en = await tToEn(r.text);
      const keywords_en = await promptKeywords(text_en);
      chunks.push({
        id: `${a.id}#${i}`, articleId: a.id,
        heading: r.heading, text: r.text, text_en, keywords_en,
        scoreHint: r.heading ? 0.15 : 0
      });
    }

    const entry: DocIndexEntry = {
      id: a.id,
      title: a.title,
      title_en,
      summary_en: await promptSummary(preview_en),
      keywords_en: await promptKeywords(preview_en),
      chunks,
      updatedAt: a.updatedAt
    };
    out.push(entry);
  }
  save(out);
  return out;
}
