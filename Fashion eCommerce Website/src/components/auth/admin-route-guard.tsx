import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useAdminAuth } from "@/features/auth/context/admin-auth-context";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { brandLogo } from "@/assets/images";

export function AdminRouteGuard() {
  const { isAdminAuthenticated, loginAdmin } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu!");
      return;
    }

    const success = loginAdmin(username, password);
    if (!success) {
      setError("Sai tài khoản hoặc mật khẩu quản trị viên.");
    }
  };

  // Nếu đã đăng nhập thành công -> Trả ra Outlet để load tiếp Dashboard
  if (isAdminAuthenticated) {
    return <Outlet />;
  }

  // Nếu chưa đăng nhập -> Hiển thị trang Login Admin Noir cực kỳ cao cấp
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Hologram Light Effect */}
        <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-red-600/30 via-white/25 to-red-600/30 blur-[1px]" />
        
        {/* Logo and Headings */}
        <div className="text-center space-y-3">
          <img
            src={brandLogo}
            alt="MADMAD Studio"
            className="h-10 w-auto mx-auto brightness-0 invert transition-transform duration-500 hover:scale-110"
          />
          <div>
            <h1 className="text-white font-black text-lg tracking-widest uppercase">MADMAD ADMIN</h1>
            <p className="text-[10px] text-stone-500 tracking-wider uppercase font-semibold mt-1">Cổng điều hành trung tâm bảo mật</p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 text-[10px] font-extrabold tracking-wide rounded-xl flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            {error}
          </div>
        )}

        {/* Form Đăng Nhập */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-extrabold tracking-widest uppercase text-stone-400">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tài khoản admin..."
                className="w-full rounded-xl border border-stone-800 bg-stone-950 px-10 py-3 text-xs text-white placeholder:text-stone-600 focus:border-stone-600 focus:bg-stone-900 focus:outline-none focus:ring-0 transition-all font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-extrabold tracking-widest uppercase text-stone-400">
              Mật khẩu bảo mật
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full rounded-xl border border-stone-800 bg-stone-950 px-10 py-3 text-xs text-white placeholder:text-stone-600 focus:border-stone-600 focus:bg-stone-900 focus:outline-none focus:ring-0 transition-all font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white hover:bg-red-600 hover:text-white text-black h-11 text-xs font-bold tracking-widest uppercase transition-all rounded-xl flex items-center justify-center gap-1.5 mt-6 shadow-lg shadow-black/30"
          >
            Đăng nhập hệ thống
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-[9px] text-stone-600 font-semibold border-t border-stone-900">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          Mã hóa bảo vệ dữ liệu SSL-256bit.
        </div>
      </div>
    </div>
  );
}
