export interface StoredPlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarEmoji: string;
}

const STORAGE_KEY = 'poker-room-player';

export function readStoredPlayer(): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlayer>;
    if (typeof parsed.id === 'string' && typeof parsed.name === 'string') {
      return {
        id: parsed.id,
        name: parsed.name,
        avatarUrl: parsed.avatarUrl ?? null,
        avatarEmoji: parsed.avatarEmoji ?? '🙂',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPlayer(player: StoredPlayer): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function clearStoredPlayer(): void {
  localStorage.removeItem(STORAGE_KEY);
}
