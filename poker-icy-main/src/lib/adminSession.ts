const STORAGE_KEY = 'poker-room-admin-key';

export function readAdminKey(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function writeAdminKey(key: string): void {
  sessionStorage.setItem(STORAGE_KEY, key);
}

export function clearAdminKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
