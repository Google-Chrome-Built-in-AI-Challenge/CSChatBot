// src/features/views/Docs.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { bootstrapLocalAI } from '@/features/chatbot/ai/bootstrap';
import { compileIndex } from '@/features/chatbot/ai/docIndex';
import './Docs.css';

// LocalStorage keys
const STORAGE_KEY = "docArticles:v1";
const LAST_OPEN_KEY = "docArticles:lastOpenId";

// Article type definition
export type Article = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

// Generate unique ID
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Load articles from localStorage
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

// Save articles to localStorage
function saveArticles(list: Article[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Dynamic import for React Markdown
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
        <div className="docs-list-title">{article.title || "(Untitled)"}</div>
        <div className="docs-list-date">{stamp}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>Delete</button>
    </div>
  );
};

// Main Docs component
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

  // Add a new blank article
  const handleAdd = () => {
    const blank: Article = {
      id: uid(),
      title: "New Article",
      content: "# New Article\nWrite your content here.",
      updatedAt: Date.now(),
    };
    setList([blank, ...list].sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveId(blank.id);
  };

  // Save current article
  const handleSave = () => {
    if (!activeId) return;
    const idx = list.findIndex((x) => x.id === activeId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = { ...next[idx], title: title.trim(), content, updatedAt: Date.now() };
    setList(next.sort((a, b) => b.updatedAt - a.updatedAt));
    dirtyRef.current = false;
  };

  // Delete an article
  const handleDelete = (id: string) => {
    const next = list.filter((x) => x.id !== id);
    setList(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  // Rebuild AI index
  const handleRebuild = async () => {
    try {
      const ai = await bootstrapLocalAI(() => {}, { companyId: 'mari' });
      if (!ai.agentLang) (ai as any).agentLang = 'en';

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
      alert(`Training complete: ${docs.length} documents`);
    } catch (e) {
      console.error('[Docs] rebuild failed', e);
      alert('Training failed: check console logs');
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
      {/* Left: Article list */}
      <div>
        <h2>Document Management</h2>
        <div className="docs-toolbar">
          <ToolbarButton onClick={handleAdd}>+ New Article</ToolbarButton>
          <ToolbarButton onClick={handleSave} disabled={!activeId}>Save</ToolbarButton>
          <ToolbarButton onClick={handleRebuild}>Update Training</ToolbarButton>
        </div>

        <Input placeholder="Search (title/content)" value={filter} onChange={(e) => setFilter(e.target.value)} />

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
            <Empty text="No articles found. Click '+ New Article' above." />
          )}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="docs-editor">
        {active ? (
          <>
            <div className="docs-editor-header">
              <Input placeholder="Title" value={title} onChange={(e) => { setTitle(e.target.value); dirtyRef.current = true; }} />
              <div className="docs-status">
                <ToolbarButton onClick={handleSave} disabled={!activeId}>Save</ToolbarButton>
              </div>
            </div>

            <div className="docs-editor-grid">
              <div>
                <div className="docs-section-title">Markdown</div>
                <Textarea value={content} onChange={(e) => { setContent(e.target.value); dirtyRef.current = true; }} />
              </div>
              <div className="docs-preview">
                {MD ? <MD>{content || "_No content available._"}</MD> : <pre style={{whiteSpace: "pre-wrap"}}>{content || "(No content)"}</pre>}
              </div>
            </div>
          </>
        ) : (
          <Empty text="Select or create an article from the left." />
        )}
      </div>
    </div>
  );
};

export default Docs;