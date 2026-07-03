import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { safeLocalStorage } from "@/utils/safe-storage";
import { API_URL } from "@/config/api";

interface AdminAuthContextValue {
  isAdminAuthenticated: boolean;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
}

const ADMIN_AUTH_STORAGE_KEY = "fashion-ecommerce.admin-auth";
const ADMIN_TOKEN_STORAGE_KEY = "fashion-ecommerce.admin-token";

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return safeLocalStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";
  });

  // Khi app khởi động, kiểm tra token đang lưu có còn hợp lệ không
  // Nếu token gần hết hạn (dưới 14 ngày), tự động gửi request gia hạn (refresh) token
  useEffect(() => {
    const storedAuth = safeLocalStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    const storedToken = safeLocalStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);

    if (storedAuth !== "true" || !storedToken) return;

    const checkAndRefresh = async () => {
      try {
        // Gửi yêu cầu gia hạn token lên server
        const response = await fetch(`${API_URL}/auth/admin-refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": storedToken
          }
        });

        if (response.status === 401 || response.status === 403) {
          // Token không hợp lệ hoặc đã quá hạn hoàn toàn → yêu cầu đăng nhập lại
          safeLocalStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
          safeLocalStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
          setIsAdminAuthenticated(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          // Nếu server quyết định cấp token mới (do token cũ sắp hết hạn)
          if (data.success && data.refreshed && data.token) {
            safeLocalStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
          }
        }
      } catch {
        // Bỏ qua lỗi kết nối mạng tạm thời để không đá user ra khi đang offline
      }
    };

    checkAndRefresh();
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      isAdminAuthenticated,
      loginAdmin: async (username, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/admin-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username: username.trim(), password }),
          });

          if (!response.ok) {
            return false;
          }

          const data = await response.json();
          if (data.success && data.token) {
            safeLocalStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
            safeLocalStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
            setIsAdminAuthenticated(true);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      logoutAdmin: () => {
        setIsAdminAuthenticated(false);
        safeLocalStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        safeLocalStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      },
    }),
    [isAdminAuthenticated],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
