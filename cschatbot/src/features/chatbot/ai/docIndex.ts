// src/features/chatbot/ai/docIndex.ts
type Article = { id: string; title: string; body?: string; content?: string; lang?: string };

type Posting = { docId: number; tf: number };
type TermRow = { df: number; idf: number; postings: Posting[] };
type DocRow = { id: string; title: string; len: number; enText: string; koText: string; origLang?: string; body: string };

let _index: {
  version: number;
  k: number;
  b: number;
  vocab: Record<string, TermRow>;
  docs: DocRow[];
  avgdl: number;
} | null = null;

const IDX_KEY = 'docIndex:v1';
const DOC_KEY = 'docDocs:v1';

const tokenize = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

function persist() {
  if (!_index) return;
  const shallow = {
    version: _index.version,
    k: _index.k,
    b: _index.b,
    vocab: _index.vocab,
    avgdl: _index.avgdl,
  };
  localStorage.setItem(IDX_KEY, JSON.stringify(shallow));
  localStorage.setItem(
    DOC_KEY,
    JSON.stringify(
      _index.docs.map(d => ({
        id: d.id,
        title: d.title,
        len: d.len,
        enText: d.enText,
        koText: d.koText,
        origLang: d.origLang,
        body: d.body,
      }))
    )
  );
}

export function load() {
  const rawDocs = localStorage.getItem(DOC_KEY);
  if (!rawDocs) return [] as DocRow[];
  try { return JSON.parse(rawDocs) as DocRow[]; } catch { return []; }
}

export function getIndex() {
  if (_index) return _index;
  const rawIdx = localStorage.getItem(IDX_KEY);
  const rawDocs = localStorage.getItem(DOC_KEY);
  if (!rawIdx || !rawDocs) return null;
  try {
    const idx = JSON.parse(rawIdx);
    const docs: DocRow[] = JSON.parse(rawDocs);
    _index = {
      version: idx.version ?? 1,
      k: idx.k ?? 1.5,
      b: idx.b ?? 0.75,
      vocab: idx.vocab ?? {},
      docs,
      avgdl: idx.avgdl ?? Math.max(1, docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length)),
    };
    return _index;
  } catch { return null; }
}

export async function compileIndex(ai: {
  getTranslator: (from: string, to: string) => Promise<{ translate: (s: string) => Promise<string> } | null>;
  detector?: { detect: (s: string) => Promise<{ detectedLanguage: string; confidence: number }[] | any> };
}, articles: Article[]) {
  const docs: DocRow[] = [];

  for (const a of articles) {
    const body = String((a as any).body ?? (a as any).content ?? '');
    const title = String((a as any).title ?? '');
    const text = `${title}\n${body}`.trim();

    let enText = text;
    let origLang = 'en';

    try {
      if (ai.detector?.detect) {
        const list = await ai.detector.detect(text.slice(0, 2000));
        const top = Array.isArray(list) ? list[0] : list;
        const det = top?.detectedLanguage || 'en';
        origLang = det;
        if (det !== 'en') {
          const t = await ai.getTranslator(det, 'en');
          if (t) enText = await t.translate(text);
        }
      }
    } catch { /* 번역 없어도 진행 */ }

    const koText = text; // 원문 보존
    const allTokens = [...tokenize(enText), ...tokenize(koText)];
    docs.push({
      id: String(a.id),
      title,
      body,
      enText,
      koText,
      len: allTokens.length || 1,
      origLang,
    });
  }

  const vocab: Record<string, TermRow> = {};
  docs.forEach((d, docId) => {
    const counts = new Map<string, number>();
    // 영어 + 원문 모두 토큰화해서 같은 vocab에 적재
    for (const t of [...tokenize(d.enText), ...tokenize(d.koText)]) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    counts.forEach((tf, term) => {
      const row = (vocab[term] ??= { df: 0, idf: 0, postings: [] });
      row.postings.push({ docId, tf });
    });
  });

  const N = docs.length || 1;
  Object.values(vocab).forEach(row => {
    row.df = row.postings.length;
    row.idf = Math.log((N - row.df + 0.5) / (row.df + 0.5) + 1e-9);
  });

  const avgdl = Math.max(1, docs.reduce((a, d) => a + d.len, 0) / Math.max(1, N));
  _index = { version: 1, k: 1.5, b: 0.75, vocab, docs, avgdl };
  persist();
  return _index;
}
