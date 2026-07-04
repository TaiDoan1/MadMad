import type { MarketingGift } from "@/types/marketing-gift";

function escapeCsv(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildMarketingMonthOptions(count = 18): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [{ value: "all", label: "Tất cả tháng" }];
  const now = new Date();

  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
    options.push({ value, label });
  }

  return options;
}

export function getCurrentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function giftMatchesMonth(gift: MarketingGift, month: string): boolean {
  if (month === "all") return true;
  const date = new Date(gift.createdAt);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return value === month;
}

export function buildMarketingCsv(gifts: MarketingGift[]): string {
  const headers = [
    "Mã phiếu",
    "Ngày tạo",
    "KOL/KOC",
    "Handle",
    "Nền tảng",
    "Liên hệ",
    "Sản phẩm",
    "Màu",
    "Size",
    "Số lượng",
    "Đơn giá",
    "Thành tiền SP",
    "Cash brand",
    "Tổng chi phí phiếu",
    "Ghi chú",
    "Trạng thái",
  ];

  const rows: string[] = [headers.join(",")];

  gifts.forEach((gift) => {
    const createdAt = new Date(gift.createdAt).toLocaleString("vi-VN");
    const status = gift.status === "completed" ? "Đã tặng" : "Đã hủy";

    if (gift.items.length === 0) {
      rows.push(
        [
          gift.giftNumber,
          createdAt,
          gift.kolName,
          gift.kolHandle ?? "",
          gift.platform ?? "",
          gift.contactInfo ?? "",
          "",
          "",
          "",
          0,
          0,
          0,
          gift.cashAmount,
          gift.totalCost,
          gift.notes ?? "",
          status,
        ]
          .map(escapeCsv)
          .join(","),
      );
      return;
    }

    gift.items.forEach((item, index) => {
      rows.push(
        [
          gift.giftNumber,
          createdAt,
          gift.kolName,
          gift.kolHandle ?? "",
          gift.platform ?? "",
          gift.contactInfo ?? "",
          item.productName,
          item.color,
          item.size,
          item.quantity,
          item.unitPrice,
          item.lineTotal,
          index === 0 ? gift.cashAmount : "",
          index === 0 ? gift.totalCost : "",
          index === 0 ? gift.notes ?? "" : "",
          index === 0 ? status : "",
        ]
          .map(escapeCsv)
          .join(","),
      );
    });
  });

  const summaryRow = [
    "",
    "",
    "TỔNG CỘNG",
    "",
    "",
    "",
    "",
    "",
    "",
    gifts.reduce((sum, gift) => sum + gift.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    "",
    gifts.reduce((sum, gift) => sum + gift.productValue, 0),
    gifts.reduce((sum, gift) => sum + gift.cashAmount, 0),
    gifts.reduce((sum, gift) => sum + gift.totalCost, 0),
    "",
    "",
  ];
  rows.push(summaryRow.map(escapeCsv).join(","));

  return `\uFEFF${rows.join("\n")}`;
}

export function downloadMarketingCsv(gifts: MarketingGift[], month: string): void {
  const csv = buildMarketingCsv(gifts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = month === "all" ? "tat-ca" : month;
  link.href = url;
  link.download = `madmad-marketing-${suffix}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function computeMarketingStats(gifts: MarketingGift[]) {
  const completed = gifts.filter((gift) => gift.status === "completed");
  const kolMap = new Map<string, number>();

  completed.forEach((gift) => {
    kolMap.set(gift.kolName, (kolMap.get(gift.kolName) ?? 0) + gift.totalCost);
  });

  return {
    totalGifts: completed.length,
    totalProductValue: completed.reduce((sum, gift) => sum + gift.productValue, 0),
    totalCash: completed.reduce((sum, gift) => sum + gift.cashAmount, 0),
    totalCost: completed.reduce((sum, gift) => sum + gift.totalCost, 0),
    topKols: [...kolMap.entries()]
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5),
  };
}
