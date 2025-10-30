// src/features/chatbot/ai/types.ts
export type Persona = {
  companyId: string;
  displayName: string;
  agentName?: string;
  agentLang: 'en' | 'ja' | 'es';
  role: string;
  tone: 'friendly-formal' | 'neutral' | 'casual';
  forbiddenPhrases?: string[];
  userLangFallbacks?: string[];
  honorifics?: Record<string,string>;
  opening?: Record<string,string>;
  replyStyle?: {
    noMarkdown?: boolean;
    maxSentences?: number;
    maxChars?: number;
    useHonorific?: boolean;        // ★ 새로 추가: 호칭을 강제로 붙일지 여부
    endingParticle?: string;       // ★ 새로 추가: 문장 끝말(예: "용", "요")
  };
};