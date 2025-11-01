import { useState, useEffect } from "react";
import './Glossary.css';

interface GlossaryItem {
  term: string;
  definition: string;
  date: string;
}

const Glossary = () => {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("glossaryItems");
    if (stored) setGlossary(JSON.parse(stored));
  }, []);

  const handleSave = () => {
    if (!term.trim() || !definition.trim()) {
      alert("용어와 설명을 모두 입력해주세요.");
      return;
    }
    const newItem: GlossaryItem = { term, definition, date: new Date().toLocaleString() };
    const updated = [newItem, ...glossary];
    setGlossary(updated);
    localStorage.setItem("glossaryItems", JSON.stringify(updated));
    setTerm("");
    setDefinition("");
  };

  return (
    <div className="glossary-card">
      <h2>맞춤어 / 용어 설정</h2>
      <p></p>

      <div className="input-area">
        <div>챗봇이 이해할 수 있는 맞춤어와 그 설명을 등록하세요.</div>
        <input
          type="text"
          placeholder="용어 입력 (예: 반품, 교환 등)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <textarea
          placeholder="해당 용어의 설명을 입력하세요"
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
        />
        <button onClick={handleSave}>용어 등록</button>
      </div>

      {glossary.length === 0 ? (
        <p className="no-items">아직 등록된 용어가 없습니다.</p>
      ) : (
        <ul className="glossary-list">
          {glossary.map((item, idx) => (
            <li key={idx}>
              <h4>{item.term}</h4>
              <p>{item.definition}</p>
              <p className="date">{item.date}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Glossary;