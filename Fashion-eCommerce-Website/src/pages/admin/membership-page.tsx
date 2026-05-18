import { useMemo, useState } from "react";
import { Award, Gift, Percent, Plus, Search, ShieldCheck, Sparkles, Trash2, User, UserPlus, X } from "lucide-react";

import { useMembership, type Member, type MembershipTierConfig } from "@/features/membership/context/membership-context";
import { API_URL } from "@/config/api";

export function AdminMembershipPage() {
  const { members, setMembers, tierConfigs, updateTierConfigs } = useMembership();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");

  // Config States (Editing Tier Configs)
  const [editingTier, setEditingTier] = useState<MembershipTierConfig | null>(null);
  const [tierMinPoints, setTierMinPoints] = useState(0);
  const [tierDiscount, setTierDiscount] = useState(0);
  const [tierGifts, setTierGifts] = useState("");

  // Member Management States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPoints, setMemberPoints] = useState(0);
  const [memberPassword, setMemberPassword] = useState("");

  // Calculate dynamic tier from points
  const calculateTierForPoints = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
    const sorted = [...tierConfigs].sort((a, b) => b.minPoints - a.minPoints);
    for (const config of sorted) {
      if (points >= config.minPoints) {
        return config.tier;
      }
    }
    return "BRONZE";
  };

  // Recalculate all members' tiers based on their points
  const triggerRecalculateAllTiers = (currentConfigs: MembershipTierConfig[]) => {
    const sorted = [...currentConfigs].sort((a, b) => b.minPoints - a.minPoints);
    const getTier = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
      for (const config of sorted) {
        if (points >= config.minPoints) return config.tier;
      }
      return "BRONZE";
    };

    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        tier: getTier(m.points),
      }))
    );
  };

  // Save Tier Config
  const handleSaveTierConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    const updatedConfigs = tierConfigs.map((cfg) => {
      if (cfg.tier === editingTier.tier) {
        return {
          ...cfg,
          minPoints: Math.max(0, tierMinPoints),
          discountPercent: Math.min(100, Math.max(0, tierDiscount)),
          gifts: tierGifts.trim(),
        };
      }
      return cfg;
    });

    updateTierConfigs(updatedConfigs);
    triggerRecalculateAllTiers(updatedConfigs);
    setEditingTier(null);
    window.alert(`Đã cập nhật cấu hình hạng VIP ${editingTier.tier} thành công! Các hạng thành viên liên quan đã tự động được tính lại.`);
  };

  // Handle Add/Edit Member Submit
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phone = memberPhone.trim().replace(/\s+/g, "");
    const email = memberEmail.trim().toLowerCase();

    if (!memberName.trim() || !phone || !email) {
      window.alert("Vui lòng điền đầy đủ Tên, SĐT và Email!");
      return;
    }

    if (selectedMember) {
      // Edit mode
      const finalPoints = Math.max(0, memberPoints);
      const updatedData = {
        fullName: memberName.trim(),
        phone,
        email,
        points: finalPoints,
        password: memberPassword.trim() || selectedMember.password,
        tier: calculateTierForPoints(finalPoints),
      };

      const updatedList = members.map((m) => {
        if (m.id === selectedMember.id) {
          return { ...m, ...updatedData };
        }
        return m;
      });
      setMembers(updatedList);

      try {
        await fetch(`${API_URL}/members/${selectedMember.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });
      } catch (err) {
        console.warn("⚠️ Lỗi cập nhật lên server, đã lưu local", err);
      }

      window.alert("Đã cập nhật thông tin thành viên thành công!");
    } else {
      // Add mode
      const phoneExists = members.some((m) => m.phone === phone);
      const emailExists = members.some((m) => m.email.toLowerCase() === email);

      if (phoneExists) {
        window.alert("Số điện thoại này đã đăng ký thành viên VIP!");
        return;
      }
      if (emailExists) {
        window.alert("Email này đã đăng ký thành viên VIP!");
        return;
      }

      const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
      const memberCardId = `MM-${randomDigits}`;
      const finalPoints = Math.max(0, memberPoints);

      const newMem: Member = {
        id: Date.now().toString(),
        fullName: memberName.trim(),
        email,
        phone,
        points: finalPoints,
        password: memberPassword.trim() || "123456",
        memberCardId,
        tier: calculateTierForPoints(finalPoints),
        createdAt: new Date().toISOString(),
      };

      setMembers((prev) => [newMem, ...prev]);

      try {
        await fetch(`${API_URL}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMem),
        });
      } catch (err) {
        console.warn("⚠️ Lỗi lưu thành viên lên server, đã lưu local", err);
      }

      window.alert(`Đã đăng ký thành công thành viên VIP mới! (Số thẻ: ${memberCardId})`);
    }

    setShowMemberModal(false);
    resetMemberForm();
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thành viên VIP "${name}" khỏi hệ thống?`)) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      try {
        await fetch(`${API_URL}/members/${id}`, { method: "DELETE" });
      } catch (err) {
        console.warn("⚠️ Lỗi xóa trên server, đã xóa local", err);
      }
      window.alert("Đã xóa thành viên.");
    }
  };

  const resetMemberForm = () => {
    setSelectedMember(null);
    setMemberName("");
    setMemberPhone("");
    setMemberEmail("");
    setMemberPoints(0);
    setMemberPassword("");
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.memberCardId.toLowerCase().includes(q);
      const matchesTier = selectedTierFilter === "all" || m.tier === selectedTierFilter;
      return matchesSearch && matchesTier;
    });
  }, [members, searchTerm, selectedTierFilter]);

  // Card theme styling mapping based on Noir aesthetic
  const getTierCardTheme = (tier: string) => {
    switch (tier) {
      case "PLATINUM":
        return {
          bg: "bg-black text-white border-stone-850",
          badge: "bg-stone-900 text-stone-100 border-stone-800",
          glow: "shadow-2xl shadow-stone-900/50 border border-stone-800",
        };
      case "GOLD":
        return {
          bg: "bg-stone-900 text-stone-100 border-stone-800",
          badge: "bg-amber-950 text-amber-300 border-amber-900",
          glow: "border border-stone-800",
        };
      case "SILVER":
        return {
          bg: "bg-stone-100 text-stone-900 border-stone-200",
          badge: "bg-stone-200 text-stone-800 border-stone-300",
          glow: "border border-stone-300",
        };
      case "BRONZE":
      default:
        return {
          bg: "bg-white text-stone-900 border-stone-200",
          badge: "bg-stone-100 text-stone-600 border-stone-200",
          glow: "border border-stone-200",
        };
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fadeIn">
      {/* 👑 PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/10 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black uppercase">QUẢN LÝ HỆ THỐNG VIP CLUB</h1>
          <p className="text-xs text-black/50">Cấu hình các hạng thẻ thành viên, phần trăm chiết khấu tự động và quản lý tệp khách hàng VIP.</p>
        </div>
        <button
          onClick={() => {
            resetMemberForm();
            setShowMemberModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-red-700 text-white px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-black/10"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Đăng Ký Thành Viên VIP
        </button>
      </div>

      {/* 🚀 SECTION 1: MEMBERSHIP TIER CONFIGURATIONS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-black" />
          <h2 className="text-sm font-extrabold tracking-widest text-black uppercase">
            CẤU HÌNH HẠNG VIP & CHIẾT KHẤU ĐỘNG
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {tierConfigs.map((config) => {
            const theme = getTierCardTheme(config.tier);
            return (
              <div
                key={config.tier}
                className={`relative rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${theme.bg} ${theme.glow}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={`inline-block px-3 py-1 text-[8px] font-black tracking-widest rounded-full border uppercase ${theme.badge}`}>
                      {config.tier}
                    </span>
                    <p className="text-[10px] opacity-50 uppercase font-semibold mt-2">
                      Tích lũy từ {config.minPoints} điểm (~{(config.minPoints * 1000).toLocaleString()}₫)
                    </p>
                  </div>
                  <div className="flex items-center text-red-500">
                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">{config.discountPercent}%</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">GIẢM GIÁ</span>
                  </div>

                  <div className="border-t border-current/10 pt-4 space-y-1.5">
                    <p className="text-[9px] font-extrabold tracking-wider uppercase opacity-55">Quyền lợi và Quà tặng:</p>
                    <p className="text-[10px] leading-relaxed opacity-85 min-h-[3.5rem]">{config.gifts}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingTier(config);
                    setTierMinPoints(config.minPoints);
                    setTierDiscount(config.discountPercent);
                    setTierGifts(config.gifts);
                  }}
                  className="w-full mt-4 border border-current/25 hover:border-current bg-transparent py-2.5 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all"
                >
                  Điều chỉnh hạng
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💼 SECTION 2: VIP CUSTOMER DIRECTORY */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-black" />
          <h2 className="text-sm font-extrabold tracking-widest text-black uppercase">
            DANH SÁCH THÀNH VIÊN ({members.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* SEARCH SIDEBAR */}
          <aside className="lg:col-span-3">
            <div className="space-y-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase">Bộ lọc & Tìm kiếm</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 py-3 pl-9 pr-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-semibold"
                    placeholder="SĐT, Email, Tên..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-extrabold tracking-widest text-black/50 uppercase">Phân loại hạng VIP</p>
                <select
                  value={selectedTierFilter}
                  onChange={(e) => setSelectedTierFilter(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                >
                  <option value="all">Tất cả hạng thẻ</option>
                  <option value="PLATINUM">PLATINUM</option>
                  <option value="GOLD">GOLD</option>
                  <option value="SILVER">SILVER</option>
                  <option value="BRONZE">BRONZE</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTierFilter("all");
                }}
                className="w-full text-center border border-black/10 hover:bg-stone-50 py-2.5 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          </aside>

          {/* MEMBERS TABLE */}
          <section className="lg:col-span-9">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-black/40 font-extrabold tracking-widest uppercase text-[9px] border-b border-black/10">
                    <tr>
                      <th className="px-6 py-4">Thành viên / Mã thẻ</th>
                      <th className="px-6 py-4">Thông tin liên hệ</th>
                      <th className="px-6 py-4 text-center">Hạng / Điểm VIP</th>
                      <th className="px-6 py-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredMembers.map((member) => {
                      const tierTheme = getTierCardTheme(member.tier);
                      return (
                        <tr key={member.id} className="transition-colors hover:bg-stone-50/50">
                          <td className="px-6 py-4 font-semibold">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-stone-900 flex items-center justify-center text-stone-100 text-[10px] font-black uppercase shadow-inner">
                                {member.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-extrabold text-black uppercase">{member.fullName}</p>
                                <p className="text-[9px] font-mono text-stone-500 tracking-wider mt-0.5">{member.memberCardId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            <p className="text-black">{member.phone}</p>
                            <p className="text-[10px] text-stone-400 font-normal mt-0.5">{member.email}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 text-[8px] font-black tracking-widest rounded-full border uppercase ${tierTheme.badge}`}>
                              {member.tier}
                            </span>
                            <p className="text-[11px] font-extrabold text-stone-900 mt-1 font-mono">{member.points} điểm</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setMemberName(member.fullName);
                                  setMemberPhone(member.phone);
                                  setMemberEmail(member.email);
                                  setMemberPoints(member.points);
                                  setMemberPassword(member.password || "");
                                  setShowMemberModal(true);
                                }}
                                className="border border-black/10 hover:bg-black hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                              >
                                Edit VIP
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.id, member.fullName)}
                                className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                                title="Xóa VIP"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-black/40 font-bold uppercase tracking-wider">
                          Không tìm thấy thành viên VIP nào phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ✏️ MODAL 1: EDIT TIER CONFIGURATION */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-black/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setEditingTier(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-black/5 pb-4 mb-6">
              <Award className="h-5 w-5 text-black" />
              <h3 className="text-xs font-black tracking-widest text-black uppercase">
                ĐIỀU CHỈNH CẤU HÌNH VIP {editingTier.tier}
              </h3>
            </div>

            <form onSubmit={handleSaveTierConfig} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                  Điểm thăng hạng tối thiểu
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={tierMinPoints}
                  onChange={(e) => setTierMinPoints(Number(e.target.value))}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                  placeholder="Ví dụ: 800"
                />
                <p className="text-[9px] text-stone-400 font-normal">Quy đổi: 1 điểm = 10,000₫ tích lũy mua sắm thực tế.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                  Phần trăm chiết khấu tự động (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={tierDiscount}
                    onChange={(e) => setTierDiscount(Number(e.target.value))}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 pr-10 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                    placeholder="Ví dụ: 10"
                  />
                  <Percent className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                  Quà tặng và Đặc quyền
                </label>
                <textarea
                  required
                  rows={4}
                  value={tierGifts}
                  onChange={(e) => setTierGifts(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-semibold leading-relaxed"
                  placeholder="Liệt kê quà tặng sinh nhật, phí vận chuyển..."
                />
              </div>

              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="flex-1 border border-black/10 hover:bg-stone-50 py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-red-700 text-white py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors shadow-lg"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👤 MODAL 2: ADD OR EDIT VIP MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border border-black/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => {
                setShowMemberModal(false);
                resetMemberForm();
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-black/5 pb-4 mb-6">
              <User className="h-5 w-5 text-black" />
              <h3 className="text-xs font-black tracking-widest text-black uppercase">
                {selectedMember ? "CẬP NHẬT THÀNH VIÊN VIP" : "ĐĂNG KÝ THÀNH VIÊN VIP MỚI"}
              </h3>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                  Họ và tên khách hàng
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold uppercase"
                  placeholder="Ví dụ: NGUYỄN VĂN A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    required
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                    placeholder="SĐT liên hệ..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                    placeholder="Email khách..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                    Điểm tích lũy VIP
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={memberPoints}
                    onChange={(e) => setMemberPoints(Number(e.target.value))}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold font-mono"
                    placeholder="Điểm ban đầu..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                    Mật khẩu truy cập
                  </label>
                  <input
                    type="text"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                    placeholder="Mặc định: 123456"
                  />
                </div>
              </div>

              {selectedMember && (
                <div className="p-3 bg-stone-50 border border-black/5 rounded-2xl flex items-center justify-between text-[10px]">
                  <span className="font-extrabold uppercase text-black/40">Hạng thẻ tính toán:</span>
                  <span className="px-2.5 py-0.5 bg-black text-white text-[8px] font-black tracking-widest rounded-full border border-stone-850 uppercase animate-pulse">
                    {calculateTierForPoints(memberPoints)}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberModal(false);
                    resetMemberForm();
                  }}
                  className="flex-1 border border-black/10 hover:bg-stone-50 py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black hover:bg-red-700 text-white py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors shadow-lg"
                >
                  {selectedMember ? "Lưu cập nhật" : "Đăng ký VIP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
