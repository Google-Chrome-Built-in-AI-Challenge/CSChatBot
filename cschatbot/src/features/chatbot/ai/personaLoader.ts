// src/features/chatbot/ai/personaLoader.ts
import type { Persona } from './types';

const LS_KEY = 'agentPersona:v1';

export function savePersonaToLocalStorage(p: Persona) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}
export function getPersonaFromLocalStorage(): Persona | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Persona) : null;
  } catch { return null; }
}

const cache = new Map<string, Persona>();

export async function loadPersona(companyId: string): Promise<Persona> {
  // 1) 로컬 우선
  const local = getPersonaFromLocalStorage();
  if (local) return local;

  // 2) 메모리 캐시
  if (cache.has(companyId)) return cache.get(companyId)!;

  
  // 3) 빌드 타임 하드코딩 매핑
  const newLocal = '../data/personas/mari.json';
  const newLocal_1 = '../data/personas/acme.json';
  
  const map: Record<string, () => Promise<Persona>> = {
    mari: () => import(newLocal).then(m => m.default),
    acme: () => import(newLocal_1).then(m => m.default),
  };

  const loader = map[companyId] ?? map['mari'];
  const persona = await loader();
  cache.set(companyId, persona);
  return persona;
}
