import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { API_URL } from "@/config/api";

import { products as initialProducts } from "@/features/products/data/products";
import type { Product } from "@/types/product";
import { useToast } from "@/components/common/toast";

interface ProductContextValue {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string | number, product: Product) => void;
  deleteProduct: (id: string | number) => void;
  updateProductColorImages: (id: string | number, colorImages: Record<string, string>) => void;
  reorderProducts: (newOrderedList: Product[]) => void;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);
const PRODUCTS_STORAGE_KEY = "fashion-ecommerce.products-v7";

export function ProductProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window === "undefined") {
      return initialProducts;
    }

    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return initialProducts;
    }

    try {
      const parsed = JSON.parse(raw) as Product[];
      if (!Array.isArray(parsed)) {
        return initialProducts;
      }
      return parsed;
    } catch {
      return initialProducts;
    }
  });

  // 📥 Tải danh sách sản phẩm từ máy chủ (Database Neon Postgres)
  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setProducts(data);
          return;
        }
      }
    } catch (error) {
      console.warn("⚠️ Không lấy được danh sách sản phẩm từ API, dùng dữ liệu local:", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
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
            setProducts((currentProducts) =>
              currentProducts.map((p) => (p.id === tempId ? savedProduct : p))
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
      updateProduct: async (id, updatedProduct) => {
        const oldProducts = [...products];
        setProducts((currentProducts) =>
          currentProducts.map((product) => (product.id === id ? updatedProduct : product)),
        );
        try {
          const response = await fetch(`${API_URL}/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedProduct),
          });
          if (response.ok) {
            const savedProduct = await response.json();
            setProducts((currentProducts) =>
              currentProducts.map((product) => (product.id === id ? savedProduct : product)),
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
      },
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
      updateProductColorImages: (id, colorImages) => {
        setProducts((currentProducts) =>
          currentProducts.map((product) =>
            product.id === id ? { ...product, colorImages } : product,
          ),
        );
      },
      reorderProducts: (newOrderedList) => {
        setProducts(newOrderedList);
      },
    }),
    [products],
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
