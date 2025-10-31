// src/features/presetManager.ts

export interface ChatbotPreset {
  agentProfile?: any;
  faqList?: any[];
  docArticles?: any[];
  persona?: any; // agentPersona:v1
  version?: number;
}

const LS_KEYS = {
  preset: 'chatbotPreset',
  profile: 'agentProfile',
  persona: 'agentPersona:v1',
  faq: 'faqList',
  docs: 'docArticles:v1',
  docsCompiled: 'docDocs:v1',
  idxCompiled: 'docIndex:v1',
} as const;

// 현재 브라우저 상태를 하나의 프리셋 스냅샷으로 묶기
export const buildPresetSnapshot = (): ChatbotPreset => {
  const agentProfile = JSON.parse(localStorage.getItem(LS_KEYS.profile) || 'null') || {};
  const faqList = JSON.parse(localStorage.getItem(LS_KEYS.faq) || '[]');
  const docArticles = JSON.parse(localStorage.getItem(LS_KEYS.docs) || '[]');
  const persona = JSON.parse(localStorage.getItem(LS_KEYS.persona) || 'null');

  return { version: 1, agentProfile, faqList, docArticles, persona };
};

// 로컬(백업용) 저장/로드/리셋 (옵션)
export const savePreset = (preset: ChatbotPreset) =>
  localStorage.setItem(LS_KEYS.preset, JSON.stringify(preset));
export const loadPreset = (): ChatbotPreset | null =>
  JSON.parse(localStorage.getItem(LS_KEYS.preset) || 'null');
export const resetPreset = () => {
  localStorage.removeItem(LS_KEYS.preset);
  localStorage.removeItem(LS_KEYS.profile);
  localStorage.removeItem(LS_KEYS.persona);
  localStorage.removeItem(LS_KEYS.faq);
  localStorage.removeItem(LS_KEYS.docs);
  localStorage.removeItem(LS_KEYS.docsCompiled);
  localStorage.removeItem(LS_KEYS.idxCompiled);
};

// 파일로 내보내기
export const exportPresetToFile = (preset?: ChatbotPreset) => {
  const data = preset ?? buildPresetSnapshot();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fname = `chatbot-preset-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// 파일에서 불러오기
export const importPresetFromFile = async (file: File): Promise<ChatbotPreset> => {
  const text = await file.text();
  let parsed: ChatbotPreset;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid preset JSON');
  }

  // 최소 필드 검증
  if (parsed && typeof parsed === 'object') {
    localStorage.setItem(LS_KEYS.profile, JSON.stringify(parsed.agentProfile || {}));
    if (parsed.persona) localStorage.setItem(LS_KEYS.persona, JSON.stringify(parsed.persona));
    localStorage.setItem(LS_KEYS.faq, JSON.stringify(parsed.faqList || []));
    localStorage.setItem(LS_KEYS.docs, JSON.stringify(parsed.docArticles || []));

    // 컴파일 산출물은 버림. 새로 빌드하도록 제거
    localStorage.removeItem(LS_KEYS.docsCompiled);
    localStorage.removeItem(LS_KEYS.idxCompiled);

    // 문서 인덱스 재빌드 트리거
    try {
      window.dispatchEvent(new CustomEvent('docIndex:rebuild'));
    } catch { /* 사일런트 */ }

    return parsed;
  }
  throw new Error('Preset format not recognized');
};
