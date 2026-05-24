import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

export type Language = "vi" | "en";
export type Currency = "VND" | "USD";

interface LanguageContextType {
  language: Language;
  currency: Currency;
  setLanguageAndCurrency: (lang: Language, curr: Currency) => void;
  formatPrice: (priceVND: number | string) => string;
  t: (vi: string, en: string) => string;
  exchangeRate: number;
  translate: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { settings } = useStorefrontSettings();
  const [language, setLanguageState] = useState<Language>("vi");
  const [currency, setCurrencyState] = useState<Currency>("VND");

  useEffect(() => {
    const savedLang = localStorage.getItem("madmad_language") as Language;
    const savedCurr = localStorage.getItem("madmad_currency") as Currency;
    if (savedLang) setLanguageState(savedLang);
    if (savedCurr) setCurrencyState(savedCurr);
  }, []);

  const setLanguageAndCurrency = (lang: Language, curr: Currency) => {
    setLanguageState(lang);
    setCurrencyState(curr);
    localStorage.setItem("madmad_language", lang);
    localStorage.setItem("madmad_currency", curr);
  };

  // Determine active exchange rate based on settings
  const exchangeRate = settings.currencyMode === "auto" 
    ? 26280 // standard auto exchange rate average today
    : (settings.exchangeRate || 25000);

  const formatPrice = (priceVND: number | string): string => {
    const numPrice = Number(priceVND) || 0;
    
    if (currency === "USD") {
      const markup = settings.intlMarkupPercent ?? 10;
      const fee = settings.intlConversionFeePercent ?? 3.5;
      
      // Converted price in USD
      const rawUsd = numPrice / exchangeRate;
      
      // Inflate price by markup and gateway conversion fee
      const baseUsdWithMarkup = rawUsd * (1 + markup / 100);
      const finalUsd = baseUsdWithMarkup / (1 - fee / 100);
      
      // Auto-round to the nearest whole dollar for clean aesthetic (e.g. $14, $20)
      const roundedUsd = Math.round(finalUsd);
      
      return `$${roundedUsd}`;
    }
    return `${numPrice.toLocaleString("vi-VN")}₫`;
  };

  const t = (vi: string, en: string) => {
    return language === "vi" ? vi : en;
  };

  const translate = (text: string): string => {
    if (language === "vi") return text;
    if (!text) return "";

    const dict: Record<string, string> = {
      // Product Names
      "Áo Thun Oversize Logo Chữ M": "Oversize T-Shirt with M Logo",
      "Áo Thun Trơn Basic (SP2)": "Basic Plain T-Shirt (SP2)",
      "Áo Thun Sản Phẩm 3 (Navy)": "Navy Cotton T-Shirt (Product 3)",
      "Sản Phẩm 4": "Oversize Streetwear Hoodie (Product 4)",

      // Product Descriptions
      "Áo thun oversize chất cotton, in logo chữ M màu đỏ nổi bật ở ngực trái.": "Oversized cotton crewneck t-shirt. Prominent embroidered red letter M logo signature at the left chest.",
      "Áo thun basic dễ phối đồ. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).": "Essential everyday plain basic cotton t-shirt. Easy to style and pair with any outfit.",
      "Áo thun màu navy basic. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).": "Versatile solid navy blue basic premium cotton t-shirt. Designed for timeless minimalist streetwear style.",
      "Mô tả cho sản phẩm 4. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).": "Signature streetwear heavyweight cotton knit drop-shoulder apparel. Designed for premium comfort and relaxed elegance.",
      
      // Categories
      "Áo Thun": "T-Shirts",
      "Áo Khoác": "Jackets",
      "Áo Sơ Mi": "Shirts",
      "Váy": "Dresses",
      "Nữ": "Women",
      
      // Colors
      "Trắng": "White",
      "Đen": "Black",
      "Xám": "Grey",
      "Navy": "Navy",
      "Default": "Default",

      // Store / Brand Titles
      "CỬA HÀNG MADMAD": "MADMAD STORE",
      "Cửa hàng MADMAD": "MADMAD Store",
      "MADMAD Shop": "MADMAD Shop",
      "MADMAD Studio": "MADMAD Studio",
      "Hệ thống MADMAD": "MADMAD System"
    };

    const trimmed = text.trim();
    if (dict[trimmed]) return dict[trimmed];

    // Try case-insensitive matching
    for (const [key, val] of Object.entries(dict)) {
      if (trimmed.toLowerCase() === key.toLowerCase()) {
        return val;
      }
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, currency, setLanguageAndCurrency, formatPrice, t, exchangeRate, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
