import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL } from "@/config/api";

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string; // Mật khẩu bảo mật cho tài khoản
  points: number; // 1 điểm = 1.000₫
  memberCardId: string; // MM-XXXXXX
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  createdAt: string;
}

export interface MembershipTierConfig {
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  minPoints: number;
  discountPercent: number;
  gifts: string;
}

const DEFAULT_TIER_CONFIGS: MembershipTierConfig[] = [
  { tier: "BRONZE", minPoints: 0, discountPercent: 2, gifts: "Thẻ thành viên điện tử, tích lũy điểm thăng hạng" },
  { tier: "SILVER", minPoints: 300, discountPercent: 5, gifts: "Chiết khấu 5% mọi đơn hàng, quà sinh nhật trị giá 100K" },
  { tier: "GOLD", minPoints: 800, discountPercent: 10, gifts: "Chiết khấu 10% mọi đơn hàng, miễn phí vận chuyển toàn quốc, quà sinh nhật trị giá 200K" },
  { tier: "PLATINUM", minPoints: 1500, discountPercent: 15, gifts: "Chiết khấu 15% mọi đơn hàng, Freeship hỏa tốc trọn đời, quà tặng sinh nhật Premium Noir trị giá 1M" },
];

interface MembershipContextType {
  members: Member[];
  currentMember: Member | null;
  registerMember: (fullName: string, email: string, phone: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginMember: (phoneOrEmail: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberProfile: (fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  logoutMember: () => void;
  addPointsToCurrentMember: (pointsToAdd: number) => void;
  deductPointsFromCurrentMember: (pointsToDeduct: number) => void;
  tierConfigs: MembershipTierConfig[];
  updateTierConfigs: (configs: MembershipTierConfig[]) => void;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(() => {
    const local = localStorage.getItem("madmad_members");
    return local ? JSON.parse(local) : [];
  });

  const [currentMember, setCurrentMember] = useState<Member | null>(() => {
    const local = localStorage.getItem("madmad_current_member");
    return local ? JSON.parse(local) : null;
  });

  const [tierConfigs, setTierConfigs] = useState<MembershipTierConfig[]>(() => {
    const local = localStorage.getItem("madmad_membership_tiers");
    return local ? JSON.parse(local) : DEFAULT_TIER_CONFIGS;
  });

  // Đồng bộ hóa database local
  useEffect(() => {
    localStorage.setItem("madmad_members", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    if (currentMember) {
      localStorage.setItem("madmad_current_member", JSON.stringify(currentMember));
    } else {
      localStorage.removeItem("madmad_current_member");
    }
  }, [currentMember]);

  useEffect(() => {
    localStorage.setItem("madmad_membership_tiers", JSON.stringify(tierConfigs));
  }, [tierConfigs]);

  const updateTierConfigs = (nextConfigs: MembershipTierConfig[]) => {
    setTierConfigs(nextConfigs);
  };

  const calculateTier = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
    const sorted = [...tierConfigs].sort((a, b) => b.minPoints - a.minPoints);
    for (const config of sorted) {
      if (points >= config.minPoints) {
        return config.tier;
      }
    }
    return "BRONZE";
  };

  const registerMember = async (fullName: string, email: string, phone: string, password?: string) => {
    try {
      const response = await fetch(`${API_URL}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, points: 50, tier: "BRONZE" }),
      });
      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.message || "Lỗi đăng ký thành viên trên hệ thống!" };
      }
      const data = await response.json();

      const newMember: Member = {
        ...data,
        id: String(data.id),
        memberCardId: `MM-${String(data.id).padStart(6, "0")}`,
        password: password || "123456", // Local password support
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setMembers((prev) => [...prev, newMember]);
      setCurrentMember(newMember); // Auto login
      return { success: true };
    } catch (e) {
      return { success: false, error: "Không thể kết nối đến máy chủ" };
    }
  };

  const loginMember = async (phoneOrEmail: string, password?: string) => {
    try {
      const trimmed = phoneOrEmail.trim().toLowerCase();
      // Gọi API tra cứu khách hàng từ Database
      const response = await fetch(`${API_URL}/members/check?query=${encodeURIComponent(trimmed)}`);
      
      if (!response.ok) {
        return { success: false, error: "Không tìm thấy thông tin thành viên với Email hoặc SĐT này!" };
      }
      
      const data = await response.json();
      
      const found: Member = {
        ...data,
        id: String(data.id),
        memberCardId: `MM-${String(data.id).padStart(6, "0")}`,
        password: "123456", // Local mock support for password
      };

      // Kiểm tra mật khẩu (hỗ trợ local)
      const storedPassword = found.password || "123456";
      if (password && storedPassword !== password) {
        return { success: false, error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại!" };
      }

      setCurrentMember(found);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Lỗi kết nối máy chủ" };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.message || "Đăng nhập Google thất bại!" };
      }
      const data = await response.json();
      const loggedInMember: Member = {
        ...data.member,
        id: String(data.member.id),
        memberCardId: `MM-${String(data.member.id).padStart(6, "0")}`,
        avatarUrl: data.member.avatarUrl
      };
      setCurrentMember(loggedInMember);
      localStorage.setItem("madmad_vip_session_token", data.sessionToken);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Không thể kết nối đến máy chủ" };
    }
  };

  const updateMemberProfile = async (fullName: string, phone: string) => {
    try {
      if (!currentMember) return { success: false, error: "Chưa đăng nhập!" };
      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-member-email": currentMember.email
        },
        body: JSON.stringify({ fullName, phone }),
      });
      if (!response.ok) {
        const err = await response.json();
        return { success: false, error: err.message || "Lỗi cập nhật thông tin!" };
      }
      const data = await response.json();
      const updated: Member = {
        ...data,
        id: String(data.id),
        memberCardId: `MM-${String(data.id).padStart(6, "0")}`,
        avatarUrl: data.avatarUrl
      };
      setCurrentMember(updated);
      return { success: true };
    } catch (e) {
      return { success: false, error: "Lỗi kết nối máy chủ" };
    }
  };

  const logoutMember = () => {
    setCurrentMember(null);
    localStorage.removeItem("madmad_vip_session_token");
  };

  const addPointsToCurrentMember = (pointsToAdd: number) => {
    if (!currentMember) return;
    const updatedPoints = currentMember.points + pointsToAdd;
    const updatedMember: Member = {
      ...currentMember,
      points: updatedPoints,
      tier: calculateTier(updatedPoints),
    };

    setCurrentMember(updatedMember);
    setMembers((prev) =>
      prev.map((m) => (m.id === currentMember.id ? updatedMember : m))
    );
  };

  const deductPointsFromCurrentMember = (pointsToDeduct: number) => {
    if (!currentMember) return;
    const updatedPoints = Math.max(0, currentMember.points - pointsToDeduct);
    const updatedMember: Member = {
      ...currentMember,
      points: updatedPoints,
      tier: calculateTier(updatedPoints),
    };

    setCurrentMember(updatedMember);
    setMembers((prev) =>
      prev.map((m) => (m.id === currentMember.id ? updatedMember : m))
    );
  };

  return (
    <MembershipContext.Provider
      value={{
        members,
        currentMember,
        registerMember,
        loginMember,
        loginWithGoogle,
        updateMemberProfile,
        logoutMember,
        addPointsToCurrentMember,
        deductPointsFromCurrentMember,
        tierConfigs,
        updateTierConfigs,
        setMembers,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error("useMembership must be used within a MembershipProvider");
  }
  return context;
}

