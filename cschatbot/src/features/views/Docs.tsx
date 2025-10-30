import React, { useState, useEffect } from "react";

interface DocItem {
  title: string;
  content: string;
  date: string;
}

const Docs = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);

  // 처음 로드 시 localStorage에서 불러오기
  useEffect(() => {
    const stored = localStorage.getItem("docs");
    if (stored) {
      setDocs(JSON.parse(stored));
    }
  }, []);

  // 새 문서 작성 후 저장
  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    const newDoc: DocItem = {
      title,
      content,
      date: new Date().toLocaleString(),
    };

    const updated = [newDoc, ...docs];
    setDocs(updated);
    localStorage.setItem("docs", JSON.stringify(updated));

    setTitle("");
    setContent("");
  };

  return (
    <div className="centered-view">
      <h2>도큐먼트 / 아티클 설정</h2>
      <p>여기에 도큐먼트 또는 아티클 관련 내용을 작성하고 저장할 수 있습니다.</p>

      <div className="w-full max-w-lg mt-6 flex flex-col gap-3">
        <input
          type="text"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded-lg"
        />
        <textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border p-2 rounded-lg h-32 resize-none"
        />
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition"
        >
          작성 완료
        </button>
      </div>

      <div className="mt-8 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">📚 저장된 도큐먼트</h3>
        {docs.length === 0 ? (
          <p className="text-gray-500">아직 작성된 도큐먼트가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {docs.map((doc, idx) => (
              <li
                key={idx}
                className="border p-3 rounded-lg bg-gray-50 shadow-sm"
              >
                <h4 className="font-semibold">{doc.title}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1">
                  {doc.content}
                </p>
                <p className="text-xs text-gray-400 mt-2">{doc.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Docs;