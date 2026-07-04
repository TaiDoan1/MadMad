import { safeLocalStorage } from "@/utils/safe-storage";

type QueueItem<T> = { id: string; ts: number; payload: T };

function readQueue<T>(key: string): QueueItem<T>[] {
  if (typeof window === "undefined") return [];
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueueItem<T>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue<T>(key: string, items: QueueItem<T>[]) {
  if (typeof window === "undefined") return;
  safeLocalStorage.setItem(key, JSON.stringify(items));
}

export function enqueue<T>(key: string, payload: T, id?: string) {
  const items = readQueue<T>(key);
  const next: QueueItem<T> = {
    id: id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    payload,
  };
  writeQueue(key, [...items, next]);
  return next.id;
}

export function peekQueue<T>(key: string) {
  return readQueue<T>(key);
}

export function removeFromQueue(key: string, ids: string[]) {
  const items = readQueue<any>(key);
  const idSet = new Set(ids);
  const next = items.filter((it) => !idSet.has(it.id));
  writeQueue(key, next);
}

export function clearQueue(key: string) {
  if (typeof window === "undefined") return;
  safeLocalStorage.removeItem(key);
}

