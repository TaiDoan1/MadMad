// Thư viện bảo vệ localStorage tránh crash trên Safari ẩn danh (Private Mode) hoặc các trình duyệt di động bị chặn bộ nhớ.
// Nếu trình duyệt không hỗ trợ hoặc chặn quyền truy cập localStorage, dữ liệu sẽ tự động lưu vào RAM (in-memory) để ứng dụng vẫn chạy mượt mà.

const memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeStorage] getItem failed for key "${key}", using memory:`, e);
    }
    return memoryStorage[key] ?? null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[SafeStorage] setItem failed for key "${key}", using memory:`, e);
    }
    memoryStorage[key] = String(value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`[SafeStorage] removeItem failed for key "${key}", using memory:`, e);
    }
    delete memoryStorage[key];
  },

  clear(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn("[SafeStorage] clear failed, using memory:", e);
    }
    for (const key in memoryStorage) {
      delete memoryStorage[key];
    }
  }
};
