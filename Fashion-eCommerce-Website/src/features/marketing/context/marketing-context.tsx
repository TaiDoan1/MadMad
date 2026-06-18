import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "@/config/api";
import type { CreateMarketingGiftInput, MarketingGift, MarketingStats } from "@/types/marketing-gift";
import { useToast } from "@/components/common/toast";

interface MarketingContextValue {
  gifts: MarketingGift[];
  stats: MarketingStats;
  isLoading: boolean;
  refreshMarketing: () => Promise<void>;
  createGift: (input: CreateMarketingGiftInput) => Promise<MarketingGift | null>;
  cancelGift: (id: string) => Promise<boolean>;
}

const defaultStats: MarketingStats = {
  totalGifts: 0,
  totalProductValue: 0,
  totalCash: 0,
  totalCost: 0,
  topKols: [],
};

const MarketingContext = createContext<MarketingContextValue | undefined>(undefined);

export function MarketingProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [gifts, setGifts] = useState<MarketingGift[]>([]);
  const [stats, setStats] = useState<MarketingStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMarketing = useCallback(async () => {
    setIsLoading(true);
    try {
      const [giftsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/marketing?_cb=${Date.now()}`),
        fetch(`${API_URL}/marketing/stats?_cb=${Date.now()}`),
      ]);

      if (giftsRes.ok) {
        const data = await giftsRes.json();
        if (Array.isArray(data)) {
          setGifts(
            data.map((gift) => ({
              ...gift,
              createdAt: gift.createdAt,
            })),
          );
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({ ...defaultStats, ...statsData });
      }
    } catch (error) {
      console.error("Failed to load marketing data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMarketing();
  }, [refreshMarketing]);

  const createGift = useCallback(
    async (input: CreateMarketingGiftInput) => {
      try {
        const response = await fetch(`${API_URL}/marketing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await response.json();
        if (!response.ok) {
          showToast(data.message || "Không thể tạo phiếu tặng", "error");
          return null;
        }
        showToast("Đã ghi nhận quà tặng KOL/KOC và trừ tồn kho!", "success");
        await refreshMarketing();
        return data as MarketingGift;
      } catch {
        showToast("Lỗi kết nối khi tạo phiếu tặng", "error");
        return null;
      }
    },
    [refreshMarketing, showToast],
  );

  const cancelGift = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`${API_URL}/marketing/${id}/cancel`, {
          method: "PUT",
        });
        const data = await response.json();
        if (!response.ok) {
          showToast(data.message || "Không thể hủy phiếu tặng", "error");
          return false;
        }
        showToast("Đã hủy phiếu tặng và hoàn tồn kho", "success");
        await refreshMarketing();
        return true;
      } catch {
        showToast("Lỗi kết nối khi hủy phiếu tặng", "error");
        return false;
      }
    },
    [refreshMarketing, showToast],
  );

  const value = useMemo(
    () => ({
      gifts,
      stats,
      isLoading,
      refreshMarketing,
      createGift,
      cancelGift,
    }),
    [gifts, stats, isLoading, refreshMarketing, createGift, cancelGift],
  );

  return <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>;
}

export function useMarketing() {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error("useMarketing must be used within a MarketingProvider");
  }
  return context;
}
