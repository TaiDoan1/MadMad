import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, Monitor, Package, Settings, ShoppingBag } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";

import { brandLogo } from "@/assets/images";
import { LoadingBar } from "@/components/common/loading-bar";
import { PageTransition, useTransitionTo } from "@/components/common/page-transition";
import { useAdminAuth } from "@/features/auth/context/admin-auth-context";

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useTransitionTo();
  const { logoutAdmin } = useAdminAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/storefront", icon: Monitor, label: "Storefront" },
    { path: "/admin/products", icon: Package, label: "Products" },
    { path: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { path: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-muted">
      <LoadingBar />
      <div className="flex">
        <aside className={`${sidebarOpen ? "w-64" : "w-20"} min-h-screen border-r border-border bg-white transition-all duration-300`}>
          <div className="flex items-center justify-between border-b border-border p-4">
            {sidebarOpen && (
              <Link to="/admin">
                <img src={brandLogo} alt="MADMAD Studio" className="h-8 w-auto transition-transform duration-300 hover:scale-125" />
              </Link>
            )}
            <button onClick={() => setSidebarOpen((value) => !value)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${active ? "bg-primary text-white" : "text-foreground hover:bg-muted"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                logoutAdmin();
                navigate("/");
              }}
            >
              <LogOut className="h-5 w-5" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-border bg-white p-4">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-xl">Admin Panel</h2>
            </div>
          </header>

          <div className="p-6">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
