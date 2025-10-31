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

  // Load existing stored FAQs + migration
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

  // Load documents from Docs (for dropdown)
  useEffect(() => {
    try {
      const docs = JSON.parse(localStorage.getItem("docArticles:v1") || "[]");
      setDocList(
        (Array.isArray(docs) ? docs : []).map((d: any) => ({
          id: d.id,
          title: d.title || "(No Title)",
        }))
      );
    } catch {}
  }, []);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      alert("Please enter both the question and the answer.");
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
      {/* Left: Input area */}
      <div className="faq-input-area">
        <h2>Create FAQ</h2>
        <p>Register frequently asked questions (FAQ).</p>
        <input
          type="text"
          placeholder="Enter the main question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea
          placeholder="Enter the answer to the question"
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
          <option value="">No document linked</option>
          {docList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        {/* Button: old design */}
        <div className="button-wrapper">
          <button onClick={handleSave}>Add FAQ</button>
        </div>
      </div>

      {/* Right: FAQ list */}
      <div className="faq-list-wrapper">
        <h2>Registered FAQs</h2>
        {faqList.length === 0 ? (
          <p className="no-items">No FAQs registered yet.</p>
        ) : (
          <ul className="faq-list">
            {faqList.map((faq, idx) => (
              <li key={idx}>
                <h4>Q. {faq.question}</h4>
                <p>A. {faq.answer}</p>
                {faq.date && <p className="date">{faq.date}</p>}
                {faq.docId && <p className="date">Linked Document ID: {faq.docId}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FAQ;