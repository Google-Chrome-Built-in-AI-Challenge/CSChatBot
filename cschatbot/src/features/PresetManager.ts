// src/features/presetManager.ts
export const savePreset = (preset: any) => localStorage.setItem('chatbotPreset', JSON.stringify(preset));
export const loadPreset = () => JSON.parse(localStorage.getItem('chatbotPreset') || 'null');
export const resetPreset = () => localStorage.removeItem('chatbotPreset');

