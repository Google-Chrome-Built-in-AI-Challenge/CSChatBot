import type { Persona } from './types';

const cache = new Map<string, Persona>();

export async function loadPersona(companyId: string): Promise<Persona> {
  if (cache.has(companyId)) return cache.get(companyId)!;

  const map: Record<string, () => Promise<Persona>> = {
    // acme: () => import('../data/personas/acme.json').then(m => m.default),
    mari: () => import('../data/personas/mari.json').then(m => m.default),
  };

  const loader = map[companyId] ?? map['mari'];  // ★ 항상 함수
  const persona = await loader();
  cache.set(companyId, persona);
  return persona;
}
