import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, Menu, Monitor, Package, Settings, ShoppingBag, ShieldCheck, X } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";

import { brandLogo } from "@/assets/images";
import { LoadingBar } from "@/components/common/loading-bar";
import { PageTransition, useTransitionTo } from "@/components/common/page-transition";
import { useAdminAuth } from "@/features/auth/context/admin-auth-context";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Tổng quan" },
  { path: "/admin/storefront", icon: Monitor, label: "Giao diện" },
  { path: "/admin/products", icon: Package, label: "Sản phẩm" },
  { path: "/admin/orders", icon: ShoppingBag, label: "Đơn hàng" },
  { path: "/admin/membership", icon: ShieldCheck, label: "Hội viên VIP" },
  { path: "/admin/settings", icon: Settings, label: "Cài đặt" },
];

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useTransitionTo();
  const { logoutAdmin } = useAdminAuth();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logoutAdmin();
    navigate("/");
  };

  const renderNav = (showLabels: boolean, onNavigate?: () => void) => (
    <nav className="space-y-2 p-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
              active ? "bg-primary text-white" : "text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {showLabels && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderLogout = (showLabels: boolean) => (
    <div className="border-t border-border/10 p-4">
      <button
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-foreground transition-colors hover:bg-muted"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {showLabels && <span>Đăng xuất</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      <LoadingBar />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={`hidden min-h-screen flex-col justify-between border-r border-border bg-white transition-all duration-300 md:flex ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <div>
            <div className="flex items-center justify-between border-b border-border p-4">
              {sidebarOpen && (
                <Link to="/admin">
                  <img
                    src={brandLogo}
                    alt="MADMAD Studio"
                    className="h-8 w-auto transition-transform duration-300 hover:scale-125"
                  />
                </Link>
              )}
              <button type="button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Thu gọn sidebar">
                <Menu className="h-5 w-5" />
              </button>
            </div>
            {renderNav(sidebarOpen)}
          </div>
          {renderLogout(sidebarOpen)}
        </aside>

        {/* Mobile drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col justify-between border-r border-border bg-white transition-transform duration-300 md:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            <div className="flex items-center justify-between border-b border-border p-4">
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                <img src={brandLogo} alt="MADMAD Studio" className="h-8 w-auto" />
              </Link>
              <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Đóng menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNav(true, () => setMobileMenuOpen(false))}
          </div>
          {renderLogout(true)}
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-white p-3 md:p-4">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-1.5 transition-colors hover:bg-muted md:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-base font-semibold md:text-xl">Hệ thống Admin</h2>
            </div>
          </header>

          <div className="p-4 md:p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
