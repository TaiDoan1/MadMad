import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "@/config/api";
import type { CreateMarketingGiftInput, MarketingGift, MarketingStats } from "@/types/marketing-gift";
import { useToast } from "@/components/common/toast";
import { getCurrentMonthValue } from "@/utils/marketing-export";

interface MarketingContextValue {
  gifts: MarketingGift[];
  stats: MarketingStats;
  isLoading: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  refreshMarketing: (month?: string) => Promise<void>;
  syncMarketingItemImages: () => Promise<{ updated: number; total: number }>;
  syncMarketingStockDeductions: () => Promise<{
    deductedItems: number;
    skippedItems: number;
    giftsChecked: number;
    errors: string[];
  }>;
  createGift: (input: CreateMarketingGiftInput) => Promise<MarketingGift | null>;
  cancelGift: (id: string) => Promise<boolean>;
  deleteExportedGifts: (month: string) => Promise<number>;
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
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

  const refreshMarketing = useCallback(async (month = selectedMonth) => {
    setIsLoading(true);
    try {
      const monthQuery = month && month !== "all" ? `&month=${encodeURIComponent(month)}` : "";
      const [giftsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/marketing?_cb=${Date.now()}${monthQuery}`),
        fetch(`${API_URL}/marketing/stats?_cb=${Date.now()}${monthQuery}`),
      ]);

      if (giftsRes.ok) {
        const data = await giftsRes.json();
        if (Array.isArray(data)) {
          setGifts(data);
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
  }, [selectedMonth]);

  useEffect(() => {
    refreshMarketing(selectedMonth);
  }, [selectedMonth, refreshMarketing]);

  const syncMarketingItemImages = useCallback(async () => {
    const response = await fetch(`${API_URL}/marketing/sync-item-images`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Không thể đồng bộ ảnh màu cho marketing");
    }

    const result = (await response.json()) as { updated: number; total: number };
    if (result.updated > 0) {
      await refreshMarketing(selectedMonth);
    }
    return result;
  }, [refreshMarketing, selectedMonth]);

  const syncMarketingStockDeductions = useCallback(async () => {
    const response = await fetch(`${API_URL}/marketing/sync-stock-deductions`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Không thể đồng bộ trừ kho marketing");
    }

    return (await response.json()) as {
      deductedItems: number;
      skippedItems: number;
      giftsChecked: number;
      errors: string[];
    };
  }, []);

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
        await refreshMarketing(selectedMonth);
        return data as MarketingGift;
      } catch {
        showToast("Lỗi kết nối khi tạo phiếu tặng", "error");
        return null;
      }
    },
    [refreshMarketing, selectedMonth, showToast],
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
        await refreshMarketing(selectedMonth);
        return true;
      } catch {
        showToast("Lỗi kết nối khi hủy phiếu tặng", "error");
        return false;
      }
    },
    [refreshMarketing, selectedMonth, showToast],
  );

  const deleteExportedGifts = useCallback(
    async (month: string) => {
      try {
        const response = await fetch(`${API_URL}/marketing/bulk`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month }),
        });
        const data = await response.json();
        if (!response.ok) {
          showToast(data.message || "Không thể xóa phiếu tặng", "error");
          return 0;
        }
        showToast(data.message || "Đã xóa phiếu tặng đã export", "success");
        await refreshMarketing(selectedMonth);
        return Number(data.deletedCount) || 0;
      } catch {
        showToast("Lỗi kết nối khi xóa phiếu tặng", "error");
        return 0;
      }
    },
    [refreshMarketing, selectedMonth, showToast],
  );

  const value = useMemo(
    () => ({
      gifts,
      stats,
      isLoading,
      selectedMonth,
      setSelectedMonth,
      refreshMarketing,
      syncMarketingItemImages,
      syncMarketingStockDeductions,
      createGift,
      cancelGift,
      deleteExportedGifts,
    }),
    [gifts, stats, isLoading, selectedMonth, refreshMarketing, syncMarketingItemImages, syncMarketingStockDeductions, createGift, cancelGift, deleteExportedGifts],
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
