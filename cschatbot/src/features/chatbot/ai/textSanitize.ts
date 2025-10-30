// 입력 언어 감지 전용. 출력엔 쓰지 마라.
export function stripForLangDetect(raw: string): string {
  let s = raw.normalize('NFC');

  // URL/이메일은 의미 없으니 제거
  s = s.replace(/\b\w+:\/\/\S+|\b[\w.+-]+@[\w.-]+\.\w+\b/g, ' ');

  // ZWJ, variation selectors, combining marks
  s = s.replace(/[\u200D\uFE0E\uFE0F]/g, '');
  s = s.normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC');

  // 이모지/픽토그래프 → 공백
  s = s.replace(/\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\p{Emoji_Modifier}/gu, ' ');
  
  // 과도한 공백 정리
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// 간단 스크립트 힌트 (감지 신뢰도 낮을 때 폴백)
export function hintByScript(raw: string): 'ko'|'ja'|'en'|null {
  const hasHangul = /[\uAC00-\uD7A3]/.test(raw);
  const hasCJK   = /[\u4E00-\u9FFF]/.test(raw);
  const hasLatin = /[A-Za-z]/.test(raw);
  if (hasHangul) return 'ko';
  if (hasCJK && !hasHangul) return 'ja';  // 대충 일본어/중국어 묶음 → ja로
  if (hasLatin) return 'en';
  return null;
}
