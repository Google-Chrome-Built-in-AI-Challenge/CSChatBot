// src/features/views/FAQ.tsx
import React, { useState, useEffect } from "react";
import { enrichFAQItem } from "@/features/chatbot/ai/faqEnricher";
import type { FAQItem } from "@/features/chatbot/types";
import './FAQ.css'; // 기존 CSS 적용

const FAQ: React.FC = () => {
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docList, setDocList] = useState<{ id: string; title: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [faqList, setFaqList] = useState<FAQItem[]>([]);

  // 기존 저장값 로드 + 마이그레이션
  useEffect(() => {
    const stored = localStorage.getItem("faqList");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as any[];
        const migrated: FAQItem[] = parsed.map((x) => ({
          question: x.question ?? "",
          answer: x.answer ?? "",
          date: x.date,
          docId: x.docId,
          docAnchor: x.docAnchor,
        }));
        setFaqList(migrated);
        localStorage.setItem("faqList", JSON.stringify(migrated));
      } catch {}
    }
  }, []);

  // Docs에서 만든 문서 목록 로드 (드롭다운용)
  useEffect(() => {
    try {
      const docs = JSON.parse(localStorage.getItem("docArticles:v1") || "[]");
      setDocList(
        (Array.isArray(docs) ? docs : []).map((d: any) => ({
          id: d.id,
          title: d.title || "(제목 없음)",
        }))
      );
    } catch {}
  }, []);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      alert("질문과 답변을 모두 입력해주세요.");
      return;
    }

    const enriched = await enrichFAQItem(question, answer, { docId });
    const updated = [enriched, ...faqList];
    setFaqList(updated);
    localStorage.setItem("faqList", JSON.stringify(updated));

    setQuestion("");
    setAnswer("");
    setDocId(undefined);
  };

  return (
    <div className="faq-card-grid">
      {/* 좌측: 입력 영역 */}
      <div className="faq-input-area">
        <h2>FAQ 작성</h2>
        <p>자주 묻는 질문(FAQ)을 등록하세요.</p>
        <input
          type="text"
          placeholder="대표 질문을 입력하세요"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea
          placeholder="해당 질문의 답변을 입력하세요"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <select
          value={docId ?? ""}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setDocId(v || undefined);
          }}
        >
          <option value="">문서 연결 안 함</option>
          {docList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        {/* 버튼: 옛날 디자인 적용 */}
        <div className="button-wrapper">
          <button onClick={handleSave}>FAQ 등록</button>
        </div>
      </div>

      {/* 우측: FAQ 리스트 */}
      <div className="faq-list-wrapper">
        <h2>등록된 FAQ</h2>
        {faqList.length === 0 ? (
          <p className="no-items">등록된 FAQ가 없습니다.</p>
        ) : (
          <ul className="faq-list">
            {faqList.map((faq, idx) => (
              <li key={idx}>
                <h4>Q. {faq.question}</h4>
                <p>A. {faq.answer}</p>
                {faq.date && <p className="date">{faq.date}</p>}
                {faq.docId && <p className="date">연결 문서 ID: {faq.docId}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FAQ;