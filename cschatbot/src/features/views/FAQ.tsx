import React, { useState, useEffect } from "react";

interface FAQItem {
  question: string;
  answer: string;
  date: string;
}

const FAQ = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [faqList, setFaqList] = useState<FAQItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("faqList");
    if (stored) {
      setFaqList(JSON.parse(stored));
    }
  }, []);

  const handleSave = () => {
    if (!question.trim() || !answer.trim()) {
      alert("질문과 답변을 모두 입력해주세요.");
      return;
    }

    const newFAQ: FAQItem = {
      question,
      answer,
      date: new Date().toLocaleString(),
    };

    const updated = [newFAQ, ...faqList];
    setFaqList(updated);
    localStorage.setItem("faqList", JSON.stringify(updated));

    setQuestion("");
    setAnswer("");
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
                <p className="text-xs text-gray-400 mt-2">{faq.date}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FAQ;