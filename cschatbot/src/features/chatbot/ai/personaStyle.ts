// src/features/chatbot/personaStyle.ts
export function applyPersonaKo(s: string, persona: any): string {
  let out = s;
  // 금지어 치환(있다면)
  const forb: string[] = persona?.forbiddenPhrases ?? [];
  forb.forEach(p => {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "자세히 확인해 도와드리겠습니다");
  });

  // 호칭
  if (persona?.replyStyle?.useHonorific) {
    const honor = persona?.honorifics?.ko || "고객님";
    const head = out.slice(0, 20);
    if (!new RegExp(`${honor}|고객님|♥`).test(head)) out = `${honor}, ${out}`;
  }

  // 끝말
  const end = persona?.replyStyle?.endingParticle;
  if (end) {
    out = out.replace(/[.!?。？！]+$/, "");
    if (!out.endsWith(end)) out += end;
  }

  // 길이 제한
  const sentenceClamp = (t: string) =>
    t.split(/(?<=[.!?。？！])\s+/).filter(Boolean).slice(0, 4).join(" ").trim();
  const cut = (t: string) => (t.length > 360 ? t.slice(0, 359) + "…" : t);

  return cut(sentenceClamp(out));
}
