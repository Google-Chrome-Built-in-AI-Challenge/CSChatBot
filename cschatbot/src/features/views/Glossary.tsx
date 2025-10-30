import React, { useState, useEffect } from "react";

interface GlossaryItem {
  term: string;
  definition: string;
  date: string;
}

const Glossary = () => {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);

  // 🧩 1️⃣ localStorage 에서 기존 데이터 불러오기
  useEffect(() => {
    const stored = localStorage.getItem("glossaryItems");
    if (stored) {
      setGlossary(JSON.parse(stored));
    }
  }, []);

  // 💾 2️⃣ 새 용어 저장하기
  const handleSave = () => {
    if (!term.trim() || !definition.trim()) {
      alert("용어와 설명을 모두 입력해주세요.");
      return;
    }

    const newItem: GlossaryItem = {
      term,
      definition,
      date: new Date().toLocaleString(),
    };

    const updated = [newItem, ...glossary];
    setGlossary(updated);
    localStorage.setItem("glossaryItems", JSON.stringify(updated));

    setTerm("");
    setDefinition("");
  };

  return (
    <div className="centered-view">
      <h2>맞춤어 / 용어 설정</h2>
      <p>챗봇이 이해할 수 있는 맞춤어와 그 설명을 등록하세요.</p>

      {/* 입력 영역 */}
      <div className="w-full max-w-lg mt-6 flex flex-col gap-3">
        <input
          type="text"
          placeholder="용어 입력 (예: 반품, 교환 등)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="border p-2 rounded-lg"
        />
        <textarea
          placeholder="해당 용어의 설명을 입력하세요"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          className="border p-2 rounded-lg h-24 resize-none"
        />
        <button
          onClick={handleSave}
          className="bg-purple-500 text-white rounded-lg py-2 hover:bg-purple-600 transition"
        >
          용어 등록
        </button>
      </div>

      {/* 저장된 용어 목록 */}
      <div className="mt-8 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">등록된 맞춤어 목록</h3>
        {glossary.length === 0 ? (
          <p className="text-gray-500">아직 등록된 용어가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {glossary.map((item, idx) => (
              <li
                key={idx}
                className="border p-3 rounded-lg bg-gray-50 shadow-sm"
              >
                <h4 className="font-semibold">{item.term}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1">
                  {item.definition}
                </p>
                <p className="text-xs text-gray-400 mt-2">{item.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Glossary;