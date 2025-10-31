// src/features/ai/docSearch.ts
import { load as loadIndex } from "./docIndex";

const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export async function searchDocs(ai: any, query: string) {
  const idx = loadIndex();
  if (!idx.length) return [];

  // to English
  let q = query;
  try {
    const det = (await ai.detector?.detect?.(query))?.[0];
    const src = det?.detectedLanguage ?? "en";
    if (!src.startsWith("en")) {
      const tr = await ai.getTranslator(src, "en");
      q = tr ? await tr.translate(query) : query;
    }
  } catch {}

  const qTok = tokenize(q);
  const hits: {
    chunkId: string, articleId: string, title: string,
    snippet: string, score: number
  }[] = [];

  for (const doc of idx) {
    const titleBonus = new Set(tokenize(doc.title_en));
    for (const ch of doc.chunks) {
      const bodyTok = tokenize(ch.text_en);
      const keySet = new Set(ch.keywords_en);
      let s = 0;

      // 토큰 교집합
      for (const t of qTok) if (bodyTok.includes(t)) s += 1.0;
      // 키워드 일치
      for (const t of qTok) if (keySet.has(t)) s += 1.8;
      // 제목/헤딩 보정
      for (const t of qTok) if (titleBonus.has(t)) s += 0.8;
      if (ch.heading) s += ch.scoreHint ?? 0;

      if (s > 0) {
        const snippet = ch.text.slice(0, 240).replace(/\s+/g, " ");
        hits.push({ chunkId: ch.id, articleId: doc.id, title: doc.title, snippet, score: s });
      }
    }
  }

  hits.sort((a,b)=>b.score-a.score);
  const top = hits.slice(0, 5);

  // 간단 재랭크: LLM에 “가장 관련있는 것” 판단시키기
  try {
    const ctx = top.map((h,i)=>`[${i}] (${h.title}) ${h.snippet}`).join("\n");
    let out = "";
    const ask = `Pick one index [n] that best answers the query.\nQuery: ${q}\nCandidates:\n${ctx}\nAnswer: only the best index number (0-${top.length-1})`;
    for await (const c of ai.prompt.promptStream(ask)) out += c;
    const k = parseInt(out.replace(/\D/g,""), 10);
    if (!Number.isNaN(k) && top[k]) return [top[k]];
  } catch {}
  return top.slice(0,1);
}
