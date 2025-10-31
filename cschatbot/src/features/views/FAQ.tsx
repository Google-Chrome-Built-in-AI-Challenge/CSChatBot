// src/features/views/FAQ.tsx
import React, { useState, useEffect } from "react";
import { enrichFAQItem } from "@/features/chatbot/ai/faqEnricher";
import type { FAQItem } from "@/features/chatbot/types";

const FAQ: React.FC = () => {
  // 문서 연결 상태 (컴포넌트 내부로 이동!)
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docList, setDocList] = useState<{ id: string; title: string }[]>([]);

  // 입력/목록 상태
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
          docId: x.docId,         // 없으면 undefined
          docAnchor: x.docAnchor, // 없으면 undefined
        }));
        setFaqList(migrated);
        localStorage.setItem("faqList", JSON.stringify(migrated));
      } catch {
        // 구형 데이터면 조용히 패스
      }
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
    } catch {
      // pass
    }
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
    <div className="centered-view">
      <h2>FAQ 설정</h2>
      <p>자주 묻는 질문(FAQ)을 등록하고 관리할 수 있습니다.</p>

      {/* 입력 필드 */}
      <div className="w-full max-w-lg mt-6 flex flex-col gap-3">
        <input
          type="text"
          placeholder="대표 질문을 입력하세요"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="border p-2 rounded-lg"
        />
        <textarea
          placeholder="해당 질문의 답변을 입력하세요"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="border p-2 rounded-lg h-24 resize-none"
        />
        <select
          value={docId ?? ""}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setDocId(v || undefined);
          }}
          className="border p-2 rounded-lg"
        >
          <option value="">문서 연결 안 함</option>
          {docList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          className="bg-green-500 text-white rounded-lg py-2 hover:bg-green-600 transition"
        >
          FAQ 등록
        </button>
      </div>

      {/* 저장된 FAQ 목록 */}
      <div className="mt-8 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-2">등록된 FAQ 목록</h3>
        {faqList.length === 0 ? (
          <p className="text-gray-500">등록된 FAQ가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {faqList.map((faq, idx) => (
              <li
                key={idx}
                className="border p-3 rounded-lg bg-gray-50 shadow-sm"
              >
                <h4 className="font-semibold">Q. {faq.question}</h4>
                <p className="text-sm text-gray-700 whitespace-pre-line mt-1">
                  A. {faq.answer}
                </p>
                {faq.date && (
                  <p className="text-xs text-gray-400 mt-2">{faq.date}</p>
                )}
                {faq.docId && (
                  <p className="text-xs text-blue-600 mt-1">
                    연결 문서 ID: {faq.docId}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FAQ;
