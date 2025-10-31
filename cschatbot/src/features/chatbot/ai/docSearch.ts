import { getIndex, load } from "./docIndex";

type AIBundle = {
  getTranslator: (from: string, to: string) => Promise<{ translate: (s: string) => Promise<string> } | null>;
  detector?: { detect: (s: string) => Promise<{ detectedLanguage: string; confidence: number }[] | any> };
};

const tokenize = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

const splitSentences = (s: string) =>
  (s || "")
    .split(/(?<=[.!?。？！])\s+|[\n\r]+/g)
    .map(t => t.trim())
    .filter(Boolean);

export type DocHit = { articleId: string; title: string; score: number; snippet: string };

export async function searchDocs(ai: AIBundle, query: string): Promise<DocHit[]> {
  const idx = getIndex();
  if (!idx || !idx.docs?.length) return [];

  // 1. 한국어/영어 병합 쿼리 생성
  let qKo = query;
  let qEn = query;
  try {
    let det = "ko";
    if (ai.detector?.detect) {
      const list = await ai.detector.detect(query.slice(0, 2000));
      const top = Array.isArray(list) ? list[0] : list;
      det = top?.detectedLanguage || "ko";
    }
    if (det !== "en") {
      const t = await ai.getTranslator(det, "en");
      if (t) qEn = await t.translate(query);
    }
  } catch {}

  const qTokens = Array.from(new Set([...tokenize(qKo), ...tokenize(qEn)])).filter(Boolean);
  console.log("[docSearch] query tokens:", qTokens);

  if (!qTokens.length) return [];

  const { vocab, docs, k, b, avgdl } = idx;
  const scores = new Map<number, number>();

  // 2. BM25 누적
  for (const term of qTokens) {
    const row = vocab[term];
    if (!row) continue;
    for (const p of row.postings) {
      const d = docs[p.docId];
      if (!d) continue;
      const tf = p.tf;
      const idf = row.idf || 1.0;
      const denom = tf + k * (1 - b + b * (d.len / Math.max(1, avgdl)));
      const add = idf * ((tf * (k + 1)) / Math.max(1e-9, denom));
      scores.set(p.docId, (scores.get(p.docId) ?? 0) + add);
    }
  }

  // 3. 정렬 (필터 없음)
  const ranked = [...scores.entries()]
    .sort((a, b2) => b2[1] - a[1])
    .slice(0, 5);

  console.log("[docSearch] raw scores:", ranked);

  if (!ranked.length) return [];

  // 4. 스니펫 추출
  const out: DocHit[] = [];
  for (const [docId, score] of ranked) {
    const d = docs[docId];
    const meta = load().find(x => x.id === d.id) || d;
    const body = meta.body || meta.koText || meta.enText || "";
    const sents = splitSentences(body);
    const hitSent =
      sents.find(s => qTokens.some(t => s.toLowerCase().includes(t))) ??
      sents[0] ??
      body.slice(0, 220);
    out.push({
      articleId: d.id,
      title: d.title || "(제목 없음)",
      score,
      snippet: hitSent.length > 300 ? hitSent.slice(0, 297) + "…" : hitSent,
    });
  }

  console.log("[docSearch] hits:", out);
  return out;
}
