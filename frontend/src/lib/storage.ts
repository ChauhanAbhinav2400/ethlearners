export type Progress = { completed: string[]; visited: string[]; lastLesson: string; scenes: Record<string, number> };
const emptyProgress: Progress = { completed: [], visited: [], lastLesson: 'source-of-truth', scenes: {} };
export function readProgress(): Progress {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('ethereum-explorer-progress-v1') || 'null');
    if (!value || typeof value !== 'object') return emptyProgress;
    const raw = value as Record<string, unknown>;
    return {
      completed: Array.isArray(raw.completed) ? raw.completed.filter((v): v is string => typeof v === 'string') : [],
      visited: Array.isArray(raw.visited) ? raw.visited.filter((v): v is string => typeof v === 'string') : [],
      lastLesson: typeof raw.lastLesson === 'string' ? raw.lastLesson : 'source-of-truth',
      // Existing four-scene saves resume at their equivalent teaching stage.
      scenes: raw.scenes && typeof raw.scenes === 'object' ? Object.fromEntries(Object.entries(raw.scenes).filter(([,v]) => Number.isInteger(v) && v >= 0 && v <= (raw.teachingVersion === 2 ? 7 : 3)).map(([id, scene]) => [id, raw.teachingVersion === 2 ? scene : [0, 4, 5, 6][scene as number]])) : {},
    };
  } catch { return emptyProgress; }
}
export function saveProgress(value: Progress): boolean {
  try { localStorage.setItem('ethereum-explorer-progress-v1', JSON.stringify({ ...value, teachingVersion: 2 })); return true; }
  catch { return false; }
}
export function readPreference(key: string): boolean {
  try { return localStorage.getItem(`ethereum-explorer-${key}`) === 'true'; } catch { return false; }
}
export function savePreference(key: string, value: boolean) {
  try { localStorage.setItem(`ethereum-explorer-${key}`, String(value)); } catch { /* Preferences remain in memory when storage is unavailable. */ }
}
