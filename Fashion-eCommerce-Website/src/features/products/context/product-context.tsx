import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL, markLocalBackendOffline } from "@/config/api";

import { products as initialProducts } from "@/features/products/data/products";
import type { Product } from "@/types/product";
import { useToast } from "@/components/common/toast";
import { safeLocalStorage } from "@/utils/safe-storage";

interface ProductContextValue {
  products: Product[];
  isLoading: boolean;
  apiError: string | null;
  refreshProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
  updateProduct: (id: string | number, product: Product) => void;
  deleteProduct: (id: string | number) => void;
  updateProductColorImages: (id: string | number, colorImages: Record<string, string>) => void;
  reorderProducts: (newOrderedList: Product[]) => void;
  reconnectLocalhost: () => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);
const PRODUCTS_STORAGE_KEY = "fashion-ecommerce.products-v7";

export function ProductProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = safeLocalStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Product[];
      if (!Array.isArray(parsed)) {
        return [];
      }
      // Lọc bỏ mọi sản phẩm mock cũ (ID < 100) khỏi local cache của products
      return parsed.filter((p) => !(!isNaN(Number(p.id)) && Number(p.id) < 100));
    } catch {
      return [];
    }
  });

  // 📥 Tải danh sách sản phẩm từ máy chủ (Database Neon Postgres)
  const loadProducts = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // Thêm tham số _cb=timestamp để vượt qua mọi tầng cache trình duyệt/CDN một cách triệt để
      const url = `${API_URL}/products?_cb=${Date.now()}`;
      console.log("📡 [MADMAD SDK] Đang gửi yêu cầu GET tới API:", url);
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📡 [MADMAD SDK] API trả về dữ liệu thành công. Số lượng sản phẩm:", data.length);
        if (Array.isArray(data)) {
          setProducts(data);
          setIsLoading(false);
          return;
        } else {
          setApiError("Cấu trúc dữ liệu API không hợp lệ: Không phải là một mảng.");
        }
      } else {
        const errText = await response.text().catch(() => "");
        console.error(`🔴 [MADMAD SDK] API trả về mã lỗi HTTP ${response.status}:`, errText);
        setApiError(`Lỗi máy chủ HTTP ${response.status}: ${response.statusText || ""}. Chi tiết: ${errText.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error("🔴 [MADMAD SDK] Lỗi kết nối API:", error);
      
      // Tự động chuyển hướng sang Production live nếu local bị kết nối lỗi (Offline)
      if (API_URL.includes("localhost")) {
        console.warn("⚠️ [MADMAD SDK] Phát hiện local backend offline. Đang tự động chuyển hướng kết nối sang Live Production!");
        markLocalBackendOffline(true);
        setTimeout(() => {
          window.location.reload();
        }, 150);
        return;
      }
      
      setApiError(`Không thể kết nối đến API máy chủ: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);


  useEffect(() => {
    if (!isLoading) {
      safeLocalStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    }
  }, [products, isLoading]);

  const handleUpdateProduct = async (id: string | number, updatedProduct: Product) => {
    const oldProducts = [...products];
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? updatedProduct : product))
    );
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      });
      if (response.ok) {
        const savedProduct = await response.json();
        const mergedProduct: Product = {
          ...updatedProduct,
          ...savedProduct,
          isPreOrder: savedProduct?.isPreOrder ?? updatedProduct.isPreOrder,
          preOrderDays: savedProduct?.preOrderDays ?? updatedProduct.preOrderDays,
          sizeGuideProfile: savedProduct?.sizeGuideProfile ?? updatedProduct.sizeGuideProfile,
        };
        setProducts((currentProducts) =>
          currentProducts.map((product) => (product.id === id ? mergedProduct : product))
        );
        showToast("Cập nhật sản phẩm thành công!", "success");
      } else {
        const errText = await response.text();
        let errMsg = "Lỗi khi cập nhật sản phẩm!";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.message) errMsg = errJson.message;
        } catch {}
        setProducts(oldProducts);
        showToast(errMsg, "error");
      }
    } catch (e) {
      console.warn("⚠️ Lỗi cập nhật sản phẩm lên server, đã lưu local", e);
      showToast("Lỗi kết nối máy chủ khi cập nhật!", "error");
    }
  };

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      isLoading,
      apiError,
      refreshProducts: loadProducts,
      addProduct: async (product) => {
        const tempId = `temp-${Date.now()}`;
        // Dùng timestamp để tạo SKU duy nhất, tránh trùng lặp với các sản phẩm đã có trong DB
        const sku = product.sku || `MAD-${Date.now().toString(36).toUpperCase()}`;
        const newProduct = { ...product, id: tempId, sku };
        setProducts((currentProducts) => [...currentProducts, newProduct]);
        try {
          const response = await fetch(`${API_URL}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newProduct),
          });
          if (response.ok) {
            const savedProduct = await response.json();
            const mergedProduct: Product = {
              ...newProduct,
              ...savedProduct,
              isPreOrder: savedProduct?.isPreOrder ?? newProduct.isPreOrder,
              preOrderDays: savedProduct?.preOrderDays ?? newProduct.preOrderDays,
              sizeGuideProfile: savedProduct?.sizeGuideProfile ?? newProduct.sizeGuideProfile,
            };
            setProducts((currentProducts) =>
              currentProducts.map((p) => (p.id === tempId ? mergedProduct : p))
            );
            showToast("Thêm sản phẩm thành công!", "success");
          } else {
            const errText = await response.text();
            console.error("Lỗi khi thêm sản phẩm lên API:", errText);
            setProducts((currentProducts) => currentProducts.filter((p) => p.id !== tempId));
            let errMsg = "Không thể lưu sản phẩm lên server!";
            try {
              const errJson = JSON.parse(errText);
              if (errJson.message) errMsg = errJson.message;
            } catch {}
            showToast(errMsg, "error");
          }
        } catch (e) {
          console.warn("⚠️ Lỗi lưu sản phẩm lên server, đã lưu local", e);
          showToast("Có lỗi xảy ra khi kết nối máy chủ!", "error");
        }
      },
      updateProduct: handleUpdateProduct,
      deleteProduct: async (id) => {
        const oldProducts = [...products];
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
        try {
          const response = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
          if (response.ok) {
            showToast("Đã xóa sản phẩm thành công!", "success");
          } else {
            setProducts(oldProducts);
            showToast("Không thể xóa sản phẩm trên server!", "error");
          }
        } catch (e) {
          console.warn("⚠️ Lỗi xóa sản phẩm trên server, đã xóa local", e);
          showToast("Lỗi kết nối máy chủ khi xóa sản phẩm!", "error");
        }
      },
      updateProductColorImages: async (id, colorImages) => {
        const product = products.find((p) => String(p.id) === String(id));
        if (!product) return;
        const updatedProduct = { ...product, colorImages };
        await handleUpdateProduct(id, updatedProduct);
      },
      reorderProducts: (newOrderedList) => {
        setProducts(newOrderedList);
      },
      reconnectLocalhost: () => {
        markLocalBackendOffline(false);
        window.location.reload();
      },
    }),
    [products, isLoading, apiError],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }

  return context;
}
