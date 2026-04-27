import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AdminAuthContextValue {
  isAdminAuthenticated: boolean;
  loginAdmin: (username: string, password: string) => boolean;
  logoutAdmin: () => void;
}

const ADMIN_AUTH_STORAGE_KEY = "fashion-ecommerce.admin-auth";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";
  });

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      isAdminAuthenticated,
      loginAdmin: (username, password) => {
        const isValid = username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD;
        if (isValid) {
          setIsAdminAuthenticated(true);
          window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
        }
        return isValid;
      },
      logoutAdmin: () => {
        setIsAdminAuthenticated(false);
        window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
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
