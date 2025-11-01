import type { Persona } from './types';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function compilePersonaFromText(
  name: string,
  desc: string,
  greeting: string
): Persona {
  const companyId = slug(name || 'agent');

  const tone =
    /친절|정중|공손|friendly/i.test(desc)
      ? 'friendly-formal'
      : /캐주얼|편하게|가볍게|casual/i.test(desc)
      ? 'casual'
      : 'neutral';

  const honorMatch =
    /(반드시|항상)?[^\.。\n]{0,10}(고객님|[\p{Emoji_Presentation}\p{Extended_Pictographic}♥♡]+고객님[\p{Emoji_Presentation}\p{Extended_Pictographic}♥♡]*)/u.exec(
      desc
    );

  const mustUseHonorific = /(반드시|항상).*호칭|반드시.*부르|항상.*부르/i.test(desc);

  const maxS = +(desc.match(/(\d+)\s*문장/)?.[1] ?? 4);
  const maxC = +(desc.match(/(\d+)\s*(자|글자)/)?.[1] ?? 350);

  const endToneRe =
    /(마지막|끝|문장)[^\.!\?。？！]{0,12}(['"“”]?[^\s'"]+['"“”]?)[^\.!\?。？！]{0,8}(붙|써|끝내)/;
  const endTone = endToneRe.exec(desc)?.[2]?.replace(/['"“”]/g, '').trim();

  const honor = honorMatch?.[2] || '고객님';

  return {
    companyId,
    displayName: name,
    agentName: name.toUpperCase().slice(0, 12),
    agentLang: 'en',
    role: desc.trim(),
    tone,
    forbiddenPhrases: ['정책상 불가입니다.'],
    userLangFallbacks: ['ko', 'en', 'ja'],
    honorifics: { ko: honor },
    opening: {
      ko: `안녕하세요, ${honor}! 무엇을 도와드릴까요?`,
      en: `Hello, ${honor}! How can I help you today?`,
    },
    replyStyle: {
      noMarkdown: true,
      maxSentences: maxS,
      maxChars: maxC,
      useHonorific: mustUseHonorific,
      endingParticle: endTone || undefined,
    },
    greeting: greeting || undefined, 
  };
}