import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

import { brandLogo } from "@/assets/images";
import { LoadingBar } from "@/components/common/loading-bar";
import { PageTransition } from "@/components/common/page-transition";
import { useAdminAuth } from "@/features/auth/context/admin-auth-context";
import { useCart } from "@/features/cart/context/cart-context";

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [logoBouncing, setLogoBouncing] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginAdmin, logoutAdmin } = useAdminAuth();
  const { itemCount: cartCount } = useCart();

  const handleLogoClick = () => {
    setLogoBouncing(true);
    setTimeout(() => setLogoBouncing(false), 500);
  };

  const isActive = (path: string) => location.pathname === path;

  const handleOpenAdmin = () => {
    if (isAdminAuthenticated) {
      navigate("/admin");
      return;
    }
    setAdminLoginError("");
    setShowAdminLoginModal(true);
  };

  const handleAdminLogin = () => {
    const success = loginAdmin(adminUsername, adminPassword);
    if (!success) {
      setAdminLoginError("Sai tài khoản hoặc mật khẩu admin.");
      return;
    }

    setShowAdminLoginModal(false);
    setAdminUsername("");
    setAdminPassword("");
    setAdminLoginError("");
    navigate("/admin");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <LoadingBar />
      <header className="sticky top-0 z-50 bg-card backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex flex-1 items-center gap-6">
              <button className="transition-colors hover:text-primary lg:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </button>

              <nav className="hidden items-center gap-6 text-xs font-semibold lg:flex">
                <Link to="/" className={`transition-bounce hover:scale-110 hover:text-primary active:scale-110 active:text-primary ${isActive("/") ? "scale-110 text-primary" : ""}`}>
                  TRANG CHỦ
                </Link>
                <Link
                  to="/shop"
                  className={`transition-bounce hover:scale-110 hover:text-primary active:scale-110 active:text-primary ${isActive("/shop") ? "scale-110 text-primary" : ""}`}
                >
                  CỬA HÀNG
                </Link>
                <Link
                  to="/about"
                  className={`transition-bounce hover:scale-110 hover:text-primary active:scale-110 active:text-primary ${isActive("/about") ? "scale-110 text-primary" : ""}`}
                >
                  GIỚI THIỆU
                </Link>
                <Link
                  to="/contact"
                  className={`transition-bounce hover:scale-110 hover:text-primary active:scale-110 active:text-primary ${isActive("/contact") ? "scale-110 text-primary" : ""}`}
                >
                  LIÊN HỆ
                </Link>
              </nav>
            </div>

            <Link to="/" className="absolute left-1/2 flex -translate-x-1/2 items-center" onClick={handleLogoClick}>
              <img src={brandLogo} alt="MADMAD Studio" className={`h-8 sm:h-10 w-auto transition-bounce hover:scale-125 sm:hover:scale-150 ${logoBouncing ? 'scale-[1.8] sm:scale-[2]' : ''}`} />
            </Link>

            <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
              <button className="transition-bounce hover:scale-110 hover:text-primary active:scale-125 active:text-primary">
                <Search className="h-5 w-5" />
              </button>
              <button className="hidden sm:block transition-bounce hover:scale-110 hover:text-primary active:scale-125 active:text-primary" onClick={handleOpenAdmin}>
                <User className="h-5 w-5" />
              </button>
              <button className="hidden sm:block transition-bounce hover:scale-110 hover:text-primary active:scale-125 active:text-primary">
                <Heart className="h-5 w-5" />
              </button>
              <Link to="/cart" className="relative transition-bounce hover:scale-110 hover:text-primary active:scale-125 active:text-primary">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white animate-pulse-slow">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-[60] animate-fadeIn bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 z-[70] h-full w-80 animate-slideInLeft bg-card shadow-2xl lg:hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Link to="/" onClick={() => { handleLogoClick(); setMobileMenuOpen(false); }}>
                <img src={brandLogo} alt="MADMAD Studio" className={`h-8 w-auto transition-bounce hover:scale-125 ${logoBouncing ? 'scale-[1.8]' : ''}`} />
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-full p-2 transition-bounce hover:bg-muted active:scale-125 active:bg-muted">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="p-6">
              <div className="space-y-1">
                {[
                  { path: "/", label: "TRANG CHỦ" },
                  { path: "/shop", label: "CỬA HÀNG" },
                  { path: "/about", label: "GIỚI THIỆU" },
                  { path: "/contact", label: "LIÊN HỆ" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm font-semibold transition-bounce hover:bg-primary hover:scale-105 hover:text-white active:scale-105 active:bg-primary active:text-white ${
                      isActive(item.path) ? "bg-primary text-white" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <div className="space-y-3">
                  <Link
                    to="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 transition-bounce hover:bg-muted hover:scale-105 active:scale-105 active:bg-muted"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="font-medium">Giỏ hàng</span>
                    {cartCount > 0 && (
                      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-bounce hover:bg-muted hover:scale-105 active:scale-105 active:bg-muted" onClick={handleOpenAdmin}>
                    <User className="h-5 w-5" />
                    <span className="font-medium">{isAdminAuthenticated ? "Vào Admin" : "Đăng nhập Admin"}</span>
                  </button>
                  {isAdminAuthenticated && (
                    <button
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-600 transition-bounce hover:bg-red-50 hover:scale-105 active:scale-105 active:bg-red-50"
                      onClick={() => {
                        logoutAdmin();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <X className="h-5 w-5" />
                      <span className="font-medium">Đăng xuất Admin</span>
                    </button>
                  )}
                  <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-bounce hover:bg-muted hover:scale-105 active:scale-105 active:bg-muted">
                    <Heart className="h-5 w-5" />
                    <span className="font-medium">Yêu thích</span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </>
      )}

      {showAdminLoginModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-2xl">Đăng nhập Admin</h3>
            <p className="mb-4 text-sm text-muted-foreground">Nhập tài khoản quản trị để vào trang admin.</p>

            <div className="space-y-4">
              <input
                type="text"
                value={adminUsername}
                onChange={(event) => setAdminUsername(event.target.value)}
                placeholder="Tên đăng nhập admin"
                className="w-full rounded border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Mật khẩu admin"
                className="w-full rounded border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {adminLoginError && <p className="text-sm text-red-600">{adminLoginError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setAdminLoginError("");
                }}
                className="rounded border border-border px-4 py-2 transition-all hover:bg-muted active:scale-95"
              >
                Hủy
              </button>
              <button onClick={handleAdminLogin} className="rounded bg-primary px-4 py-2 text-white transition-all hover:bg-primary/90 active:scale-95">
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="mt-20 bg-[#1a1a1a] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4">Công ty</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="transition-all hover:text-white active:text-white">Giới thiệu</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Tuyển dụng</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Báo chí</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4">Tài nguyên</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="transition-all hover:text-white active:text-white">Blog</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Bảng size</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Câu hỏi thường gặp</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="transition-all hover:text-white active:text-white">Liên hệ</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Vận chuyển</a></li>
                <li><a href="#" className="transition-all hover:text-white active:text-white">Đổi trả</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4">Đăng ký nhận tin</h3>
              <p className="mb-4 text-gray-400">Cập nhật sớm nhất về bộ sưu tập mới và ưu đãi đặc biệt.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Địa chỉ email"
                  className="flex-1 rounded border border-white/20 bg-white/10 px-4 py-2 text-white placeholder:text-gray-400"
                />
                <button className="rounded bg-primary px-6 py-2 transition-bounce hover:bg-primary/90 hover:scale-105 active:scale-110 active:bg-primary/90">Đăng ký</button>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-gray-400">
            <p>&copy; 2026 MADMAD Studio. Bản quyền thuộc về chúng tôi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
