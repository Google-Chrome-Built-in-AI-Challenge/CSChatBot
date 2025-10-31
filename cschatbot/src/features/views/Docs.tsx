import React, { useEffect, useMemo, useRef, useState } from "react";

// LocalStorage keys
const STORAGE_KEY = "docArticles:v1";
const LAST_OPEN_KEY = "docArticles:lastOpenId";

type Article = {
  id: string;
  title: string;
  content: string;
  updatedAt: number; // epoch ms
};

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

// tiny id
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const useReactMarkdown = () => {
  const [MD, setMD] = useState<null | React.ComponentType<any>>(null);
  useEffect(() => {
    let mounted = true;
    // optional dynamic import; falls back gracefully if not installed
    import("react-markdown")
      .then((m) => mounted && setMD(() => (m.default as any) ?? m as any))
      .catch(() => mounted && setMD(null));
    return () => {
      mounted = false;
    };
  }, []);
  return MD;
};

const Empty = ({ text }: { text: string }) => (
  <div style={{ padding: 24, color: "#666", fontSize: 14 }}>{text}</div>
);

const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={(props.className ?? "") + " docs-btn"}
    style={{
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
    }}
  />
);

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    style={{
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #ddd",
      borderRadius: 8,
      fontSize: 14,
      ...(p.style ?? {}),
    }}
  />
);

const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...p}
    style={{
      width: "100%",
      height: "calc(100vh - 220px)",
      padding: "12px",
      border: "1px solid #ddd",
      borderRadius: 8,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.5,
      ...(p.style ?? {}),
    }}
  />
);

const ListItem: React.FC<{
  article: Article;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ article, active, onClick, onDelete }) => {
  const date = new Date(article.updatedAt);
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: active ? "2px solid #4f46e5" : "1px solid #eee",
        background: active ? "#eef2ff" : "#fff",
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
          {article.title || "(제목 없음)"}
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>{stamp}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="삭제"
        style={{
          border: "1px solid #f0f0f0",
          background: "#fff",
          color: "#b91c1c",
          padding: "6px 10px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        삭제
      </button>
    </div>
  );
};

const Docs: React.FC = () => {
  const [list, setList] = useState<Article[]>(() =>
    loadArticles().sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(LAST_OPEN_KEY));
  const active = useMemo(() => list.find((x) => x.id === activeId) ?? null, [list, activeId]);
  const [title, setTitle] = useState(active?.title ?? "");
  const [content, setContent] = useState(active?.content ?? "");
  const [filter, setFilter] = useState("");
  const MD = useReactMarkdown();
  const dirtyRef = useRef(false);

  // open last
  useEffect(() => {
    if (!active && list.length && !activeId) {
      setActiveId(list[0].id);
    }
  }, [list, active, activeId]);

  // when active changes, hydrate editor
  useEffect(() => {
    setTitle(active?.title ?? "");
    setContent(active?.content ?? "");
    localStorage.setItem(LAST_OPEN_KEY, active?.id ?? "");
    dirtyRef.current = false;
  }, [active?.id]);

  // persist list on change
  useEffect(() => {
    saveArticles(list);
  }, [list]);

  // save shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleAdd = () => {
    const blank: Article = {
      id: uid(),
      title: "새 아티클",
      content: "# 새 아티클\n여기에 내용을 작성하세요.",
      updatedAt: Date.now(),
    };
    const next = [blank, ...list];
    setList(next.sort((a, b) => b.updatedAt - a.updatedAt));
    setActiveId(blank.id);
  };

  const handleSave = () => {
    if (!activeId) return;
    const idx = list.findIndex((x) => x.id === activeId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = { ...next[idx], title: title.trim(), content, updatedAt: Date.now() };
    next.sort((a, b) => b.updatedAt - a.updatedAt);
    setList(next);
    dirtyRef.current = false;
  };

  const handleDelete = (id: string) => {
    const next = list.filter((x) => x.id !== id);
    setList(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
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
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, height: "100%", padding: 12 }}>
      {/* Left: list */}
      <div style={{ borderRight: "1px solid #eee", paddingRight: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <ToolbarButton onClick={handleAdd}>+ 새 아티클</ToolbarButton>
          <ToolbarButton onClick={handleSave} disabled={!activeId}>
            ⌘/Ctrl+S 저장
          </ToolbarButton>
        </div>
        <Input
          placeholder="검색 (제목/본문)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div style={{ display: "grid", gap: 8, marginTop: 12, maxHeight: "calc(100vh - 220px)", overflow: "auto" }}>
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

      {/* Right: editor */}
      <div style={{ paddingLeft: 4 }}>
        {active ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <Input
                placeholder="제목"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  dirtyRef.current = true;
                }}
              />
              <div style={{ fontSize: 12, color: "#666" }}>
                {dirtyRef.current ? "변경사항 있음" : "저장됨"}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, margin: "6px 0" }}>Markdown</div>
                <Textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    dirtyRef.current = true;
                  }}
                />
              </div>
              <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, overflow: "auto", height: "calc(100vh - 220px)" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>미리보기</div>
                {MD ? (
                  <MD>{content || "_내용이 없습니다._"}</MD>
                ) : (
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "#444" }}>
                    react-markdown 미설치 상태. 텍스트로 표시합니다.

{content || "(내용 없음)"}
                  </pre>
                )}
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
