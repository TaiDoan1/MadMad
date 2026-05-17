import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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

interface MembershipContextType {
  members: Member[];
  currentMember: Member | null;
  registerMember: (fullName: string, email: string, phone: string, password?: string) => { success: boolean; error?: string };
  loginMember: (phoneOrEmail: string, password?: string) => { success: boolean; error?: string };
  logoutMember: () => void;
  addPointsToCurrentMember: (pointsToAdd: number) => void;
  deductPointsFromCurrentMember: (pointsToDeduct: number) => void;
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

  const registerMember = (fullName: string, email: string, phone: string, password?: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim().replace(/\s+/g, "");

    const emailExists = members.some((m) => m.email.toLowerCase() === trimmedEmail);
    const phoneExists = members.some((m) => m.phone === trimmedPhone);

    if (emailExists) return { success: false, error: "Email này đã được đăng ký thành viên!" };
    if (phoneExists) return { success: false, error: "Số điện thoại này đã được đăng ký thành viên!" };

    // Tạo mã thẻ thành viên ngẫu nhiên MM-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
    const memberCardId = `MM-${randomDigits}`;

    const newMember: Member = {
      id: Date.now().toString(),
      fullName,
      email: trimmedEmail,
      phone: trimmedPhone,
      password: password || "123456", // Default fallback if empty
      points: 50, // Quà tặng chào mừng thành viên mới: 50 điểm (~50k)
      memberCardId,
      tier: "BRONZE",
      createdAt: new Date().toISOString(),
    };

    setMembers((prev) => [...prev, newMember]);
    setCurrentMember(newMember); // Auto login sau khi đăng ký
    return { success: true };
  };

  const loginMember = (phoneOrEmail: string, password?: string) => {
    const trimmed = phoneOrEmail.trim().toLowerCase();
    const found = members.find(
      (m) => m.email.toLowerCase() === trimmed || m.phone === trimmed.replace(/\s+/g, "")
    );

    if (!found) {
      return { success: false, error: "Không tìm thấy thông tin thành viên với Email hoặc SĐT này!" };
    }

    // Kiểm tra mật khẩu (hỗ trợ tài khoản cũ mặc định mật khẩu là 123456)
    const storedPassword = found.password || "123456";
    if (password && storedPassword !== password) {
      return { success: false, error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại!" };
    }

    setCurrentMember(found);
    return { success: true };
  };

  const logoutMember = () => {
    setCurrentMember(null);
  };

  const calculateTier = (points: number): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" => {
    if (points >= 1500) return "PLATINUM"; // Trên 1.5M points tích lũy
    if (points >= 800) return "GOLD";
    if (points >= 300) return "SILVER";
    return "BRONZE";
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
        logoutMember,
        addPointsToCurrentMember,
        deductPointsFromCurrentMember,
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
