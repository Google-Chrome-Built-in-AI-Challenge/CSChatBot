// src/features/views/Docs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { bootstrapLocalAI } from '@/features/chatbot/ai/bootstrap';
import { compileIndex } from '@/features/chatbot/ai/docIndex';
import './Docs.css';

// LocalStorage keys
const STORAGE_KEY = "docArticles:v1";
const LAST_OPEN_KEY = "docArticles:lastOpenId";

export type Article = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function loadArticles(): Article[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Article[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveArticles(list: Article[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Markdown 동적 import
const useReactMarkdown = () => {
  const [MD, setMD] = useState<null | React.ComponentType<any>>(null);
  useEffect(() => {
    let mounted = true;
    import("react-markdown")
      .then((m) => mounted && setMD(() => (m.default as any) ?? (m as any)))
      .catch(() => mounted && setMD(null));
    return () => { mounted = false; };
  }, []);
  return MD;
};

// Reusable components
const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button {...props} className="docs-btn" />
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className="docs-input" />
);

const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className="docs-editor-textarea" />
);

const Empty = ({ text }: { text: string }) => (
  <div className="docs-empty">{text}</div>
);

const ListItem: React.FC<{
  article: Article;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ article, active, onClick, onDelete }) => {
  const date = new Date(article.updatedAt);
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return (
    <div className={`docs-list-item ${active ? "active" : ""}`} onClick={onClick}>
      <div>
        <div className="docs-list-title">{article.title || "(제목 없음)"}</div>
        <div className="docs-list-date">{stamp}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>삭제</button>
    </div>
  );
};

const Docs: React.FC = () => {
  const [list, setList] = useState<Article[]>(() =>
    loadArticles().sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    localStorage.getItem(LAST_OPEN_KEY)
  );
  const active = useMemo(() => list.find((x) => x.id === activeId) ?? null, [list, activeId]);
  const [title, setTitle] = useState(active?.title ?? "");
  const [content, setContent] = useState(active?.content ?? "");
  const [filter, setFilter] = useState("");
  const dirtyRef = useRef(false);
  const MD = useReactMarkdown();

  useEffect(() => {
    if (!active && list.length && !activeId) setActiveId(list[0].id);
  }, [list, active, activeId]);

  useEffect(() => {
    setTitle(active?.title ?? "");
    setContent(active?.content ?? "");
    localStorage.setItem(LAST_OPEN_KEY, active?.id ?? "");
    dirtyRef.current = false;
  }, [active?.id]);

  useEffect(() => {
    saveArticles(list);
  }, [list]);

  const handleAdd = () => {
    const blank: Article = {
      id: uid(),
      title: "새 아티클",
      content: "# 새 아티클\n여기에 내용을 작성하세요.",
      updatedAt: Date.now(),
    };
    setList([blank, ...list].sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveId(blank.id);
  };

  const handleSave = () => {
    if (!activeId) return;
    const idx = list.findIndex((x) => x.id === activeId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = { ...next[idx], title: title.trim(), content, updatedAt: Date.now() };
    setList(next.sort((a, b) => b.updatedAt - a.updatedAt));
    dirtyRef.current = false;
  };

  const handleDelete = (id: string) => {
    const next = list.filter((x) => x.id !== id);
    setList(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const handleRebuild = async () => {
    try {
      const ai = await bootstrapLocalAI(() => {}, { companyId: 'mari' });
      if (!ai.agentLang) (ai as any).agentLang = 'ko';

      const stripMd = (s: string) =>
        (s || '')
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/`[^`]*`/g, ' ')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/[*_~>`#>-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const srcList = (() => {
        const arr = [...list];
        if (activeId) {
          const i = arr.findIndex(x => x.id === activeId);
          if (i >= 0) arr[i] = { ...arr[i], title, content };
        }
        return arr;
      })();

      const articles = srcList.map(a => ({ id: a.id, title: a.title || '', body: stripMd(a.content || '') }));
      await compileIndex(ai, articles);

      const docs = JSON.parse(localStorage.getItem('docDocs:v1') || '[]');
      const idx  = JSON.parse(localStorage.getItem('docIndex:v1') || '{}');
      console.log('[docIndex] docs:', docs.length, 'vocab terms:', Object.keys(idx.vocab || {}).length);
      alert(`학습 완료: 문서 ${docs.length}개`);
    } catch (e) {
      console.error('[Docs] rebuild failed', e);
      alert('학습 실패: 콘솔 로그 확인');
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (x) =>
        x.title.toLowerCase().includes(q) ||
        x.content.toLowerCase().includes(q)
    );
  }, [list, filter]);

  return (
    <div className="docs-card">
      {/* 좌측 리스트 */}
      <div>
        <div className="docs-toolbar">
          <ToolbarButton onClick={handleAdd}>+ 새 아티클</ToolbarButton>
          <ToolbarButton onClick={handleSave} disabled={!activeId}>저장</ToolbarButton>
          <ToolbarButton onClick={handleRebuild}>학습 업데이트</ToolbarButton>
        </div>

        <Input placeholder="검색 (제목/본문)" value={filter} onChange={(e) => setFilter(e.target.value)} />

        <div className="docs-list-items">
          {filtered.length ? (
            filtered.map((a) => (
              <ListItem
                key={a.id}
                article={a}
                active={a.id === activeId}
                onClick={() => setActiveId(a.id)}
                onDelete={() => handleDelete(a.id)}
              />
            ))
          ) : (
            <Empty text="아티클이 없습니다. 오른쪽 위 ‘+ 새 아티클’을 누르세요." />
          )}
        </div>
      </div>

      {/* 우측 에디터 */}
      <div className="docs-editor">
        {active ? (
          <>
            <div className="docs-editor-header">
              <Input placeholder="제목" value={title} onChange={(e) => { setTitle(e.target.value); dirtyRef.current = true; }} />
              <div className="docs-status">
                <ToolbarButton onClick={handleSave} disabled={!activeId}>저장</ToolbarButton>
              </div>
            </div>

            <div className="docs-editor-grid">
              <div>
                <div className="docs-section-title">Markdown</div>
                <Textarea value={content} onChange={(e) => { setContent(e.target.value); dirtyRef.current = true; }} />
              </div>
              <div className="docs-preview">
                {MD ? <MD>{content || "_내용이 없습니다._"}</MD> : <pre style={{whiteSpace: "pre-wrap"}}>{content || "(내용 없음)"}</pre>}
              </div>
            </div>
          </>
        ) : (
          <Empty text="왼쪽에서 아티클을 선택하거나 새로 만드세요." />
        )}
      </div>
    </div>
  );
};

export default Docs;