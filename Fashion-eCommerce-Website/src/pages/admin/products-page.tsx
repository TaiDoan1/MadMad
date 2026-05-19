import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Edit, Eye, Image as ImageIcon, Plus, Search, Settings2, Trash2, X } from "lucide-react";

import { ImageUploadInput } from "@/components/common/image-upload-input";
import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useProducts } from "@/features/products/context/product-context";
import { readStoredCoupons, saveCoupons } from "@/features/promotions/services/coupon-service";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import type { Coupon } from "@/types/coupon";
import type { Product } from "@/types/product";
import { useToast } from "@/components/common/toast";

const PRODUCT_OPTIONS_STORAGE_KEY = "fashion-ecommerce.product-options";

type ProductOptions = {
  categories: string[];
  sizes: string[];
  colors: string[];
  tags: string[];
};

const DEFAULT_PRODUCT_OPTIONS: ProductOptions = {
  categories: ["Váy", "Áo Thun", "Áo Khoác", "Áo Sơ Mi"],
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  colors: ["Trắng", "Đen", "Xám", "Đỏ", "Navy", "Be"],
  tags: ["new", "hot", "best-seller"],
};

export function AdminProductsPage() {
  const { showToast } = useToast();
  const { products, addProduct, updateProduct, deleteProduct, updateProductColorImages, reorderProducts } = useProducts();
  const { settings, updateSettings } = useStorefrontSettings();
  const [draggedProductId, setDraggedProductId] = useState<string | number | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showColorImagesModal, setShowColorImagesModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [colorImageDrafts, setColorImageDrafts] = useState<Record<string, string>>({});
  const [editingColorImages, setEditingColorImages] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<string[]>([""]);
  const [productOptions, setProductOptions] = useState<ProductOptions>(() => {
    if (typeof window === "undefined") return DEFAULT_PRODUCT_OPTIONS;
    const raw = window.localStorage.getItem(PRODUCT_OPTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRODUCT_OPTIONS;
    try {
      const parsed = JSON.parse(raw) as ProductOptions;
      return {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_PRODUCT_OPTIONS.categories,
        sizes: Array.isArray(parsed.sizes) && parsed.sizes.length > 0 ? parsed.sizes : DEFAULT_PRODUCT_OPTIONS.sizes,
        colors: Array.isArray(parsed.colors) && parsed.colors.length > 0 ? parsed.colors : DEFAULT_PRODUCT_OPTIONS.colors,
        tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : DEFAULT_PRODUCT_OPTIONS.tags,
      };
    } catch {
      return DEFAULT_PRODUCT_OPTIONS;
    }
  });
  const [colorHexDrafts, setColorHexDrafts] = useState<Record<string, string>>(
    settings.colorHexMap ?? {},
  );
  const [couponDraft, setCouponDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [sizeDraft, setSizeDraft] = useState("");
  const [colorDraft, setColorDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [newColorInput, setNewColorInput] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    originalPrice: 0,
    discountPercent: 0,
    category: "",
    image: "",
    sizeChartImage: "",
    description: "",
    sizes: "",
    inStock: true,
    rating: 5,
    reviews: 0,
  });

  const [stockType, setStockType] = useState<"simple" | "variant">("simple");
  const [stockInput, setStockInput] = useState<number>(999);
  const [variantStockDraft, setVariantStockDraft] = useState<Record<string, number>>({});

  const [formTab, setFormTab] = useState<"info" | "attributes" | "media" | "inventory">("info");

  const resetForm = () => {
    setFormData({ name: "", price: 0, originalPrice: 0, discountPercent: 0, category: productOptions.categories[0] ?? "", image: "", sizeChartImage: "", description: "", sizes: "", inStock: true, rating: 5, reviews: 0 });
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
    setColorImageDrafts({});
    setProductImages([""]);
    setSelectedProduct(null);
    setStockType("simple");
    setStockInput(999);
    setVariantStockDraft({});
    setFormTab("info");
  };

  const getProductStockInfo = (prod: Product) => {
    if (prod.variantStock && Object.keys(prod.variantStock).length > 0) {
      const total = Object.values(prod.variantStock).reduce((sum, val) => sum + val, 0);
      return { total, isVariant: true };
    }
    return { total: prod.stock !== undefined ? prod.stock : null, isVariant: false };
  };

  const normalizedImages = productImages.map((value) => value.trim()).filter(Boolean);
  const mainImage = normalizedImages[0] || formData.image.trim();
  const calculatedPriceFromPercent =
    formData.originalPrice > 0 && formData.discountPercent > 0
      ? Math.max(0, Math.round(formData.originalPrice * (1 - formData.discountPercent / 100)))
      : null;

  const categories = useMemo(() => productOptions.categories, [productOptions.categories]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesSearch = !q || product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q);
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
  }, [products, searchTerm, selectedCategory]);

  const selectedCount = filteredProducts.length;
  const normalizeHex = (value: string) => {
    const hex = value.trim();
    return /^#([0-9A-Fa-f]{6})$/.test(hex) ? hex : "#D1D5DB";
  };
  const persistProductOptions = (nextProductOptions: ProductOptions) => {
    setProductOptions(nextProductOptions);
    window.localStorage.setItem(PRODUCT_OPTIONS_STORAGE_KEY, JSON.stringify(nextProductOptions));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl">Quản Lý Sản Phẩm</h1>
          <p className="text-muted-foreground">Tìm kiếm, lọc, xem nhanh và chỉnh sửa sản phẩm.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setColorHexDrafts((current) => ({ ...settings.colorHexMap, ...current }));
              setCategoryDraft(productOptions.categories.join(", "));
              setSizeDraft(productOptions.sizes.join(", "));
              setColorDraft(productOptions.colors.join(", "));
              setTagDraft(productOptions.tags.join(", "));
              setCouponDraft(
                readStoredCoupons()
                  .map((coupon) => `${coupon.code}|${coupon.discountAmount}`)
                  .join("\n"),
              );
              setShowOptionsModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded border border-border bg-white px-4 py-3 transition-colors hover:bg-muted"
          >
            <Settings2 className="h-5 w-5" />
            Settings
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-5 w-5" />
            Thêm Sản Phẩm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="space-y-5 rounded-lg border border-border bg-white p-6">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Tìm kiếm</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded border border-border py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tên sản phẩm, danh mục..."
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-muted-foreground">Danh mục</p>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full rounded border border-border bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Kết quả</p>
              <p className="text-2xl">{selectedCount}</p>
              <p className="text-xs text-muted-foreground">sản phẩm</p>
            </div>

            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="w-full rounded border border-border px-4 py-3 transition-colors hover:bg-muted"
            >
              Xoá bộ lọc
            </button>
          </div>
        </aside>

        <section className="lg:col-span-8">
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="border-b border-border p-4">
              <h2 className="text-lg">Danh sách sản phẩm</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Danh mục</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Giá</th>
                    <th className="px-6 py-3 text-left text-xs uppercase tracking-wider">Kho</th>
                    <th className="px-6 py-3 text-right text-xs uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      draggable={!searchTerm && selectedCategory === "all"}
                      onDragStart={(e) => {
                        setDraggedProductId(product.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverProductId(product.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedProductId && String(draggedProductId) !== String(product.id)) {
                          const dragIndex = products.findIndex((p) => String(p.id) === String(draggedProductId));
                          const dropIndex = products.findIndex((p) => String(p.id) === String(product.id));
                          if (dragIndex !== -1 && dropIndex !== -1) {
                            const newOrder = [...products];
                            const [draggedItem] = newOrder.splice(dragIndex, 1);
                            newOrder.splice(dropIndex, 0, draggedItem);
                            reorderProducts(newOrder);
                          }
                        }
                        setDraggedProductId(null);
                        setDragOverProductId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedProductId(null);
                        setDragOverProductId(null);
                      }}
                      className={`transition-colors hover:bg-muted/50 ${String(draggedProductId) === String(product.id) ? "opacity-50 bg-stone-50" : ""} ${String(dragOverProductId) === String(product.id) ? "border-t-2 border-black bg-stone-100" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {(!searchTerm && selectedCategory === "all") && (
                            <div className="cursor-grab text-black/20 hover:text-black">
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 3C4.5 3.82843 3.82843 4.5 3 4.5C2.17157 4.5 1.5 3.82843 1.5 3C1.5 2.17157 2.17157 1.5 3 1.5C3.82843 1.5 4.5 2.17157 4.5 3ZM4.5 7.5C4.5 8.32843 3.82843 9 3 9C2.17157 9 1.5 8.32843 1.5 7.5C1.5 6.67157 2.17157 6 3 6C3.82843 6 4.5 6.67157 4.5 7.5ZM3 13.5C3.82843 13.5 4.5 12.8284 4.5 12C4.5 11.1716 3.82843 10.5 3 10.5C2.17157 10.5 1.5 11.1716 1.5 12C1.5 12.8284 2.17157 13.5 3 13.5ZM10.5 3C10.5 3.82843 9.82843 4.5 9 4.5C8.17157 4.5 7.5 3.82843 7.5 3C7.5 2.17157 8.17157 1.5 9 1.5C9.82843 1.5 10.5 2.17157 10.5 3ZM9 9C9.82843 9 10.5 8.32843 10.5 7.5C10.5 6.67157 9.82843 6 9 6C8.17157 6 7.5 6.67157 7.5 7.5C7.5 8.32843 8.17157 9 9 9ZM10.5 12C10.5 12.8284 9.82843 13.5 9 13.5C8.17157 13.5 7.5 12.8284 7.5 12C7.5 11.1716 8.17157 10.5 9 10.5C9.82843 10.5 10.5 11.1716 10.5 12ZM13.5 4.5C14.3284 4.5 15 3.82843 15 3C15 2.17157 14.3284 1.5 13.5 1.5C12.6716 1.5 12 2.17157 12 3C12 3.82843 12.6716 4.5 13.5 4.5ZM15 7.5C15 8.32843 14.3284 9 13.5 9C12.6716 9 12 8.32843 12 7.5C12 6.67157 12.6716 6 13.5 6C14.3284 6 15 6.67157 15 7.5ZM13.5 13.5C14.3284 13.5 15 12.8284 15 12C15 11.1716 14.3284 10.5 13.5 10.5C12.6716 10.5 12 11.1716 12 12C12 12.8284 12.6716 13.5 13.5 13.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                            </div>
                          )}
                          <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                            <ImageWithFallback src={product.image} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">ID: #{product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{product.category}</td>
                      <td className="px-6 py-4">
                        <div>{product.price.toLocaleString("vi-VN")}₫</div>
                        {product.originalPrice ? (
                          <div className="text-xs text-muted-foreground line-through">{product.originalPrice.toLocaleString("vi-VN")}₫</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const stockInfo = getProductStockInfo(product);
                          if (stockInfo.total === null) {
                            return (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {product.inStock ? "Còn hàng" : "Hết hàng"}
                              </span>
                            );
                          }
                          
                          if (stockInfo.total <= 0) {
                            return (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                                Hết hàng (0)
                              </span>
                            );
                          }
                          
                          if (stockInfo.total <= 5) {
                            return (
                              <span className="rounded-full bg-amber-105 px-3 py-1 text-xs font-bold text-amber-800" title={stockInfo.isVariant ? "Tồn kho theo biến thể" : "Tồn kho tổng"}>
                                Sắp hết ({stockInfo.total})
                              </span>
                            );
                          }
                          
                          return (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800" title={stockInfo.isVariant ? "Tồn kho theo biến thể" : "Tồn kho tổng"}>
                              Còn {stockInfo.total} chiếc
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded p-2 transition-colors hover:bg-muted"
                            title="Xem nhanh"
                            onClick={() => {
                              setPreviewProduct(product);
                              setShowPreviewModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-2 transition-colors hover:bg-muted"
                            title="Chỉnh sửa"
                            onClick={() => {
                              setSelectedProduct(product);
                              setFormData({
                                name: product.name,
                                price: product.price,
                                originalPrice: product.originalPrice || 0,
                                discountPercent: product.discountPercent || 0,
                                category: product.category,
                                image: product.image,
                                sizeChartImage: product.sizeChartImage || "",
                                description: product.description,
                                sizes: product.sizes.join(", "),
                                inStock: product.inStock,
                                rating: product.rating,
                                reviews: product.reviews,
                              });
                              setProductImages((product.images && product.images.length > 0 ? product.images : [product.image]).concat(""));
                              setSelectedSizes(product.sizes);
                              setSelectedColors(product.colors);
                              setSelectedTags(product.tags ?? []);
                              setColorImageDrafts(product.colorImages || {});
                              setStockInput(product.stock !== undefined ? product.stock : 999);
                              setVariantStockDraft(product.variantStock || {});
                              setStockType(product.variantStock && Object.keys(product.variantStock).length > 0 ? "variant" : "simple");
                              setFormTab("info");
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-2 text-blue-600 transition-colors hover:bg-blue-100"
                            title="Ảnh theo màu"
                            onClick={() => {
                              setSelectedProduct(product);
                              setEditingColorImages(product.colorImages || {});
                              setShowColorImagesModal(true);
                            }}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-2 text-red-600 transition-colors hover:bg-red-100"
                            title="Xóa"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn xóa "${product.name}"?`)) {
                                deleteProduct(product.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        Không có sản phẩm nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {showAddModal || showEditModal ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 animate-fadeIn">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white border border-black/10 shadow-2xl relative animate-scaleUp">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-black/5 bg-white p-6 z-10">
              <div>
                <h2 className="text-lg font-black tracking-tight text-black uppercase">
                  {showAddModal ? "TẠO SẢN PHẨM MỚI" : "CHỈNH SỬA SẢN PHẨM"}
                </h2>
                <p className="text-[10px] text-black/40 uppercase font-semibold mt-0.5">
                  {showAddModal ? "Thiết lập sản phẩm thời trang Noir cao cấp" : `Đang hiệu chỉnh: ${formData.name}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded-full p-2 hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>

            {/* Elegant Tab Headers */}
            <div className="shrink-0 flex border-b border-black/5 px-6 bg-stone-50/50">
              <button
                type="button"
                onClick={() => setFormTab("info")}
                className={`flex-1 py-3 text-center text-[10px] font-extrabold tracking-widest uppercase border-b-2 transition-all ${
                  formTab === "info"
                    ? "border-black text-black"
                    : "border-transparent text-black/35 hover:text-black"
                }`}
              >
                Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setFormTab("attributes")}
                className={`flex-1 py-3 text-center text-[10px] font-extrabold tracking-widest uppercase border-b-2 transition-all ${
                  formTab === "attributes"
                    ? "border-black text-black"
                    : "border-transparent text-black/35 hover:text-black"
                }`}
              >
                Đặc tính sản phẩm
              </button>
              <button
                type="button"
                onClick={() => setFormTab("media")}
                className={`flex-1 py-3 text-center text-[10px] font-extrabold tracking-widest uppercase border-b-2 transition-all ${
                  formTab === "media"
                    ? "border-black text-black"
                    : "border-transparent text-black/35 hover:text-black"
                }`}
              >
                Hình ảnh & Mô tả
              </button>
              <button
                type="button"
                onClick={() => setFormTab("inventory")}
                className={`flex-1 py-3 text-center text-[10px] font-extrabold tracking-widest uppercase border-b-2 transition-all ${
                  formTab === "inventory"
                    ? "border-black text-black"
                    : "border-transparent text-black/35 hover:text-black"
                }`}
              >
                Tồn kho
              </button>
            </div>

            {/* Modal Body with Tab Contents */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
              
              {/* TAB 1: BASIC INFO */}
              {formTab === "info" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Tên sản phẩm thời trang
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold uppercase"
                      placeholder="Ví dụ: BLACK DRESS NOIR"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Danh mục
                      </label>
                      <select
                        value={formData.category}
                        onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                      >
                        {productOptions.categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Trạng thái Tồn kho
                      </label>
                      <select
                        value={formData.inStock ? "true" : "false"}
                        onChange={(event) => setFormData({ ...formData, inStock: event.target.value === "true" })}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-bold"
                      >
                        <option value="true">Còn hàng (In Stock)</option>
                        <option value="false">Hết hàng (Out of Stock)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Giá gốc (nếu có)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.originalPrice}
                        onChange={(event) => setFormData({ ...formData, originalPrice: Number(event.target.value) })}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono font-bold"
                        placeholder="Giá gốc..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Giảm giá % (nếu có)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={formData.discountPercent}
                        onChange={(event) => setFormData({ ...formData, discountPercent: Number(event.target.value) })}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono font-bold"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Giá bán thực tế
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={formData.price}
                        onChange={(event) => setFormData({ ...formData, price: Number(event.target.value) })}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-mono font-bold text-black"
                        placeholder="Giá bán..."
                      />
                    </div>
                  </div>

                  {calculatedPriceFromPercent !== null && (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-stone-50/50 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold text-black/40 uppercase tracking-widest">
                          Gợi ý giá bán tự động (-{formData.discountPercent}%):
                        </p>
                        <p className="text-sm font-black text-black font-mono mt-0.5">
                          {calculatedPriceFromPercent.toLocaleString("vi-VN")}₫
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((current) => ({ ...current, price: calculatedPriceFromPercent }))}
                        className="bg-black hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                      >
                        Áp Dụng
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ATTRIBUTES (SIZES, COLORS, TAGS) */}
              {formTab === "attributes" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Sizes Select */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Bảng Sizes khả dụng
                    </label>
                    <div className="flex flex-wrap gap-2.5 rounded-2xl border border-black/15 p-3.5 bg-stone-50/40">
                      {productOptions.sizes.map((size) => {
                        const active = selectedSizes.includes(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              setSelectedSizes((current) =>
                                current.includes(size) ? current.filter((item) => item !== size) : [...current, size],
                              )
                            }
                            className={`px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                              active
                                ? "bg-black border-black text-white"
                                : "bg-white border-black/10 text-black hover:bg-stone-50"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colors Select */}
                  <div className="space-y-3">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Màu sắc khả dụng
                    </label>
                    <div className="flex flex-wrap gap-2.5 rounded-2xl border border-black/15 p-3.5 bg-stone-50/40">
                      {productOptions.colors.map((color) => {
                        const active = selectedColors.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() =>
                              setSelectedColors((current) =>
                                current.includes(color) ? current.filter((item) => item !== color) : [...current, color],
                              )
                            }
                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all uppercase ${
                              active
                                ? "bg-black border-black text-white"
                                : "bg-white border-black/10 text-black hover:bg-stone-50"
                            }`}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 max-w-sm">
                      <input
                        value={newColorInput}
                        onChange={(event) => setNewColorInput(event.target.value)}
                        className="flex-1 rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all"
                        placeholder="Thêm màu mới (ví dụ: Nude)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextColor = newColorInput.trim();
                          if (!nextColor) return;
                          if (productOptions.colors.includes(nextColor)) {
                            showToast("Màu sắc này đã tồn tại trong danh mục.", "warning");
                            return;
                          }
                          const nextOptions: ProductOptions = {
                            ...productOptions,
                            colors: [...productOptions.colors, nextColor],
                          };
                          persistProductOptions(nextOptions);
                          setColorHexDrafts((current) => ({ ...current, [nextColor]: "#D1D5DB" }));
                          setSelectedColors((current) => [...current, nextColor]);
                          setNewColorInput("");
                        }}
                        className="bg-black hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-4 rounded-xl transition-colors"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>

                  {/* Tags Selector */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Thẻ phân loại tags (Đánh dấu hiển thị)
                    </label>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-black/15 p-3.5 bg-stone-50/40">
                      {productOptions.tags.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setSelectedTags((current) =>
                                current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
                              )
                            }
                            className={`px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-lg border transition-all uppercase ${
                              active
                                ? "bg-black border-black text-white"
                                : "bg-white border-black/10 text-stone-500 hover:bg-stone-50"
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Images Mapping (Inside Attributes for cohesion) */}
                  {selectedColors.length > 0 && (
                    <div className="space-y-3 border-t border-black/10 pt-4">
                      <div>
                        <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                          Hình ảnh cụ thể theo từng màu (Tùy chọn)
                        </label>
                        <p className="text-[9px] text-black/35 mt-0.5">Tải lên hoặc dán URL ảnh mặt trước và mặt sau cho từng màu sắc.</p>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {selectedColors.map((color) => (
                          <div key={color} className="flex flex-col gap-2.5 bg-stone-50 p-3.5 border border-black/5 rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-wide text-black/80">{color}</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-extrabold tracking-widest uppercase text-black/40">Ảnh mặt trước</label>
                                <ImageUploadInput
                                  value={colorImageDrafts[`${color}-front`] || colorImageDrafts[color] || ""}
                                  onChange={(value) =>
                                    setColorImageDrafts((current) => ({ ...current, [`${color}-front`]: value }))
                                  }
                                  placeholder="Tải lên ảnh mặt trước"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-extrabold tracking-widest uppercase text-black/40">Ảnh mặt sau (Tùy chọn)</label>
                                <ImageUploadInput
                                  value={colorImageDrafts[`${color}-back`] || ""}
                                  onChange={(value) =>
                                    setColorImageDrafts((current) => ({ ...current, [`${color}-back`]: value }))
                                  }
                                  placeholder="Tải lên ảnh mặt sau"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MEDIA (PRODUCT GALLERY & DESCRIPTION) */}
              {formTab === "media" && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Textarea Description */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Mô tả chất liệu & Chi tiết thiết kế
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs focus:bg-white focus:border-black/60 focus:outline-none transition-all font-semibold leading-relaxed"
                      placeholder="Mô tả chất vải, form dáng, cách bảo quản..."
                      rows={3}
                    />
                  </div>

                  {/* Size Chart Image */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Hình ảnh bảng size (Size Chart)
                    </label>
                    <ImageUploadInput
                      value={formData.sizeChartImage}
                      onChange={(value) => setFormData({ ...formData, sizeChartImage: value })}
                      placeholder="https://... (URL ảnh bảng size chuẩn)"
                    />
                  </div>

                  {/* Multi-images gallery manager */}
                  <div className="space-y-3 border-t border-black/10 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                          Bộ sưu tập ảnh sản phẩm (Nhiều ảnh)
                        </label>
                        <p className="text-[9px] text-black/35 mt-0.5">Khuyến nghị: Tỉ lệ 1:1 vuông (1200x1200px) cho ảnh chi tiết.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductImages((current) => [...current, ""])}
                        className="bg-black hover:bg-stone-800 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all"
                      >
                        + Thêm URL ảnh
                      </button>
                    </div>

                    <div className="space-y-3">
                      {productImages.map((url, index) => (
                        <div key={index} className="flex items-center gap-3 bg-stone-50/60 p-3 border border-black/5 rounded-2xl">
                          <span className="text-[10px] font-extrabold text-black/40">#{index + 1}</span>
                          <ImageUploadInput
                            value={url}
                            onChange={(value) => {
                              const next = [...productImages];
                              next[index] = value;
                              setProductImages(next);
                            }}
                            className="flex-1"
                            placeholder={index === 0 ? "Ảnh chính (URL)" : "Ảnh phụ (URL)"}
                          />
                          {productImages.length > 1 && (
                            <button
                              type="button"
                              className="p-2 text-stone-400 hover:text-red-650 transition-colors"
                              onClick={() => setProductImages((current) => current.filter((_, i) => i !== index))}
                              title="Xóa ảnh"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          )}
                          {index > 0 && (
                            <button
                              type="button"
                              className="border border-black/10 hover:bg-black hover:text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors"
                              onClick={() => {
                                setProductImages((current) => {
                                  const next = [...current];
                                  const [picked] = next.splice(index, 1);
                                  next.unshift(picked);
                                  return next;
                                });
                              }}
                              title="Đặt làm ảnh chính"
                            >
                              Chính
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Main Image Preview card */}
                  {mainImage && (
                    <div className="rounded-2xl border border-black/10 p-3 bg-stone-50/20 max-w-sm">
                      <p className="mb-2 text-[9px] font-extrabold tracking-widest text-black/40 uppercase">Preview Ảnh chính hiển thị</p>
                      <div className="h-44 w-44 overflow-hidden rounded-xl border border-black/10 bg-white">
                        <ImageWithFallback src={mainImage} alt="Main Preview" className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: INVENTORY */}
              {formTab === "inventory" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                      Phương thức quản lý kho
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStockType("simple")}
                        className={`flex flex-col items-center justify-center p-4 border rounded-2xl transition-all ${
                          stockType === "simple"
                            ? "border-black bg-stone-50 text-black font-extrabold"
                            : "border-black/10 text-stone-400 hover:border-black/40 hover:text-black"
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wider font-extrabold">Đơn giản</span>
                        <span className="text-[9px] mt-1 opacity-70">Một số lượng tồn kho cho toàn bộ sản phẩm</span>
                      </button>
                      <button
                        type="button"
                        disabled={selectedColors.length === 0 || selectedSizes.length === 0}
                        onClick={() => setStockType("variant")}
                        className={`flex flex-col items-center justify-center p-4 border rounded-2xl transition-all ${
                          selectedColors.length === 0 || selectedSizes.length === 0
                            ? "opacity-40 cursor-not-allowed border-dashed"
                            : stockType === "variant"
                            ? "border-black bg-stone-50 text-black font-extrabold"
                            : "border-black/10 text-stone-400 hover:border-black/40 hover:text-black"
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wider font-extrabold">Theo biến thể</span>
                        <span className="text-[9px] mt-1 opacity-70">Quản lý số lượng riêng cho từng Màu + Size</span>
                      </button>
                    </div>
                    {(selectedColors.length === 0 || selectedSizes.length === 0) && (
                      <p className="text-[9px] text-amber-600 font-bold mt-1">
                        * Vui lòng chọn ít nhất một Màu sắc và Size tại tab "Đặc tính sản phẩm" để kích hoạt quản lý kho theo biến thể.
                      </p>
                    )}
                  </div>

                  {stockType === "simple" ? (
                    <div className="space-y-1.5 bg-stone-50/50 p-4 border border-black/5 rounded-2xl">
                      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                        Số lượng tồn kho tổng
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={stockInput}
                        onChange={(e) => setStockInput(Math.max(0, Number(e.target.value)))}
                        className="w-full max-w-xs rounded-xl border border-black/10 bg-white px-4 py-3 text-xs focus:border-black/60 focus:outline-none transition-all font-mono font-bold"
                        placeholder="Ví dụ: 100"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 bg-stone-50/50 p-4 border border-black/5 rounded-2xl">
                      <div>
                        <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
                          Số lượng chi tiết theo biến thể (Màu sắc - Kích cỡ)
                        </label>
                        <p className="text-[9px] text-black/40 mt-0.5">Nhập số lượng tồn kho cụ thể cho từng biến thể để hiển thị tại trang sản phẩm.</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                        {selectedColors.map((color) =>
                          selectedSizes.map((size) => {
                            const key = `${color}-${size}`;
                            const value = variantStockDraft[key] !== undefined ? variantStockDraft[key] : 10;
                            return (
                              <div key={key} className="flex items-center justify-between bg-white px-4 py-2.5 border border-black/5 rounded-xl gap-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-black">
                                  {color} <span className="opacity-40">/</span> {size}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={value}
                                  onChange={(e) => {
                                    const nextVal = Math.max(0, Number(e.target.value));
                                    setVariantStockDraft((current) => ({
                                      ...current,
                                      [key]: nextVal,
                                    }));
                                  }}
                                  className="w-24 rounded-lg border border-black/10 bg-stone-50/40 px-3 py-1.5 text-center text-xs focus:border-black/65 focus:outline-none transition-all font-mono font-bold"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Actions Footer */}
            <div className="shrink-0 flex justify-end gap-3 border-t border-black/5 p-6 bg-white rounded-b-lg">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="border border-black/10 hover:bg-stone-50 px-6 py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-colors"
              >
                Hủy bỏ
              </button>
              
              {formTab !== "inventory" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (formTab === "info") setFormTab("attributes");
                    else if (formTab === "attributes") setFormTab("media");
                    else if (formTab === "media") setFormTab("inventory");
                  }}
                  className="bg-black hover:bg-red-700 text-white px-6 py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-all shadow-md shadow-black/10"
                >
                  Tiếp Tục
                </button>
              ) : (
                <button
                  onClick={() => {
                    const colorImages: Record<string, string> = {};
                    selectedColors.forEach((color) => {
                      const frontUrl = (colorImageDrafts[`${color}-front`] || colorImageDrafts[color] || "").trim();
                      const backUrl = (colorImageDrafts[`${color}-back`] || "").trim();
                      if (frontUrl) colorImages[`${color}-front`] = frontUrl;
                      if (backUrl) colorImages[`${color}-back`] = backUrl;
                    });

                    let finalStock: number | undefined = undefined;
                    let finalVariantStock: Record<string, number> | undefined = undefined;
                    let autoInStock = formData.inStock;

                    if (stockType === "simple") {
                      finalStock = stockInput;
                      finalVariantStock = undefined;
                      if (stockInput === 0) {
                        autoInStock = false;
                      } else {
                        autoInStock = true;
                      }
                    } else {
                      finalVariantStock = {};
                      let totalVariantQty = 0;
                      selectedColors.forEach((color) => {
                        selectedSizes.forEach((size) => {
                          const k = `${color}-${size}`;
                          const qty = variantStockDraft[k] !== undefined ? variantStockDraft[k] : 10;
                          finalVariantStock![k] = qty;
                          totalVariantQty += qty;
                        });
                      });
                      finalStock = undefined;
                      if (totalVariantQty === 0) {
                        autoInStock = false;
                      } else {
                        autoInStock = true;
                      }
                    }

                    const nextProduct: Product = {
                      ...(selectedProduct ?? { id: 0 }),
                      name: formData.name,
                      price: formData.price,
                      originalPrice: formData.originalPrice || undefined,
                      discountPercent: formData.discountPercent > 0 ? formData.discountPercent : undefined,
                      tags: selectedTags,
                      category: formData.category,
                      image: mainImage,
                      images: normalizedImages.length > 0 ? normalizedImages : mainImage ? [mainImage] : [],
                      sizeChartImage: formData.sizeChartImage.trim() || undefined,
                      description: formData.description,
                      sizes: selectedSizes,
                      colors: selectedColors,
                      colorImages: Object.keys(colorImages).length ? colorImages : undefined,
                      inStock: autoInStock,
                      stock: finalStock,
                      variantStock: finalVariantStock,
                      rating: formData.rating,
                      reviews: formData.reviews,
                    };

                    if (showAddModal) addProduct(nextProduct);
                    if (showEditModal && selectedProduct) updateProduct(selectedProduct.id, nextProduct);

                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="bg-black hover:bg-red-700 text-white px-6 py-3 rounded-xl text-[10px] font-extrabold tracking-widest uppercase transition-all shadow-md shadow-black/10"
                >
                  {showAddModal ? "Thêm Sản Phẩm" : "Lưu Thay Đổi"}
                </button>
              )}
            </div>
          </div>
        </div>
      , document.body) : null}

      {showColorImagesModal && selectedProduct ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="shrink-0 flex items-start justify-between border-b border-border bg-white p-6 z-10">
              <div>
                <h2 className="text-2xl">Quản Lý Hình Ảnh Theo Màu</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowColorImagesModal(false);
                  setSelectedProduct(null);
                }}
                className="rounded p-2 transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-6">
              {selectedProduct.colors.map((color) => (
                <div key={color} className="flex items-center gap-4 rounded-lg bg-muted/30 p-4">
                  <div className="h-24 w-24 overflow-hidden rounded-lg border border-border bg-white">
                    {selectedProduct.colorImages?.[color] ? (
                      <ImageWithFallback src={selectedProduct.colorImages[color]} alt={`${selectedProduct.name} - ${color}`} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <ImageUploadInput
                    value={editingColorImages[color] || ""}
                    onChange={(value) => setEditingColorImages({ ...editingColorImages, [color]: value })}
                    className="flex-1"
                    placeholder={`URL hình ảnh cho màu ${color}`}
                  />
                </div>
              ))}
                  <p className="text-xs text-muted-foreground">Khuyến nghị ảnh theo màu: 1200x1200 (tỉ lệ 1:1), ánh sáng và góc chụp giống ảnh chính.</p>
            </div>
            <div className="shrink-0 flex justify-end gap-3 border-t border-border p-6 bg-white rounded-b-lg">
              <button onClick={() => { setShowColorImagesModal(false); setSelectedProduct(null); }} className="rounded border border-border px-6 py-2 transition-colors hover:bg-muted">Đóng</button>
              <button
                onClick={() => {
                  updateProductColorImages(selectedProduct.id, editingColorImages);
                  setShowColorImagesModal(false);
                  setSelectedProduct(null);
                  setEditingColorImages({});
                }}
                className="rounded bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      {showPreviewModal && previewProduct ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-border bg-white p-6 z-10">
              <div className="min-w-0">
                <h2 className="truncate text-2xl">{previewProduct.name}</h2>
                <p className="text-sm text-muted-foreground">ID: #{previewProduct.id} • {previewProduct.category}</p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewProduct(null);
                }}
                className="rounded p-2 transition-colors hover:bg-muted"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <ImageWithFallback src={previewProduct.image} alt={previewProduct.name} className="h-full w-full object-cover" />
                </div>
                {(previewProduct.images?.length ?? 0) > 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {(previewProduct.images ?? []).slice(0, 10).map((url) => (
                      <div key={url} className="aspect-square overflow-hidden rounded bg-muted">
                        <ImageWithFallback src={url} alt={previewProduct.name} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Giá</p>
                  <p className="text-2xl text-primary">{previewProduct.price.toLocaleString("vi-VN")}₫</p>
                  {previewProduct.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through">{previewProduct.originalPrice.toLocaleString("vi-VN")}₫</p>
                  )}
                  {previewProduct.discountPercent ? (
                    <p className="text-sm text-green-600">Giảm {previewProduct.discountPercent}%</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  <p className="text-lg">{previewProduct.inStock ? "Còn hàng" : "Hết hàng"}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Mô tả</p>
                  <p className="whitespace-pre-line">{previewProduct.description}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Sizes</p>
                  <p>{previewProduct.sizes.join(", ")}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Colors</p>
                  <p>{previewProduct.colors.join(", ")}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Tags</p>
                  <p>{(previewProduct.tags ?? []).length > 0 ? previewProduct.tags?.join(", ") : "Chưa có tag"}</p>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex justify-end gap-3 border-t border-border p-6 bg-white rounded-b-lg">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewProduct(null);
                }}
                className="rounded border border-border px-6 py-2 transition-colors hover:bg-muted"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const product = previewProduct;
                  setShowPreviewModal(false);
                  setPreviewProduct(null);
                  setSelectedProduct(product);
                  setFormData({
                    name: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice || 0,
                    discountPercent: product.discountPercent || 0,
                    category: product.category,
                    image: product.image,
                    sizeChartImage: product.sizeChartImage || "",
                    description: product.description,
                    sizes: product.sizes.join(", "),
                    inStock: product.inStock,
                    rating: product.rating,
                    reviews: product.reviews,
                  });
                  setProductImages((product.images && product.images.length > 0 ? product.images : [product.image]).concat(""));
                  setSelectedSizes(product.sizes);
                  setSelectedColors(product.colors);
                  setSelectedTags(product.tags ?? []);
                  setColorImageDrafts(product.colorImages || {});
                  setShowEditModal(true);
                }}
                className="rounded bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      {showOptionsModal ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-border bg-white p-6 z-10">
              <div>
                <h2 className="text-2xl">Cài đặt tuỳ chọn cố định</h2>
                <p className="text-sm text-muted-foreground">Quản lý danh mục, size, màu để dùng thống nhất khi tạo sản phẩm.</p>
              </div>
              <button onClick={() => setShowOptionsModal(false)} className="rounded p-2 transition-colors hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-5 p-6">
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Danh mục (cách nhau bởi dấu phẩy)</p>
                <input
                  value={categoryDraft}
                  onChange={(event) => setCategoryDraft(event.target.value)}
                  className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Size cố định (cách nhau bởi dấu phẩy)</p>
                <input
                  value={sizeDraft}
                  onChange={(event) => setSizeDraft(event.target.value)}
                  className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Màu sắc cố định (cách nhau bởi dấu phẩy)</p>
                <input
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Tag cố định (cách nhau bởi dấu phẩy)</p>
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="mt-2 flex gap-2">
                  <input
                    value={newTagInput}
                    onChange={(event) => setNewTagInput(event.target.value)}
                    className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Thêm tag mới, ví dụ: limited"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextTag = newTagInput.trim().toLowerCase();
                      if (!nextTag) return;
                      const currentTags = tagDraft
                        .split(",")
                        .map((item) => item.trim().toLowerCase())
                        .filter(Boolean);
                      if (currentTags.includes(nextTag)) {
                        showToast("Tag đã tồn tại.", "warning");
                        return;
                      }
                      const merged = [...currentTags, nextTag];
                      setTagDraft(merged.join(", "));
                      setNewTagInput("");
                    }}
                    className="rounded bg-primary px-3 py-2 text-sm text-white transition-colors hover:bg-primary/90"
                  >
                    + Tag
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-muted-foreground">Mã màu HEX theo tên màu</p>
                <div className="space-y-2 rounded border border-border p-3">
                  {productOptions.colors.map((colorName) => {
                    const hex = normalizeHex(colorHexDrafts[colorName] || "#D1D5DB");
                    return (
                      <div key={colorName} className="grid grid-cols-[120px_80px_1fr] items-center gap-2">
                        <span className="text-sm">{colorName}</span>
                        <input
                          type="color"
                          value={hex}
                          onChange={(event) =>
                            setColorHexDrafts((current) => ({ ...current, [colorName]: event.target.value }))
                          }
                          className="h-9 w-full cursor-pointer rounded border border-border bg-white"
                        />
                        <input
                          type="text"
                          value={hex}
                          onChange={(event) =>
                            setColorHexDrafts((current) => ({ ...current, [colorName]: event.target.value }))
                          }
                          placeholder="#RRGGBB"
                          className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Mã giảm giá (mỗi dòng: CODE|Số tiền giảm)</p>
                <textarea
                  value={couponDraft}
                  onChange={(event) => setCouponDraft(event.target.value)}
                  rows={6}
                  className="w-full rounded border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={"WELCOME30|30000\nVIP100|100000"}
                />
                <p className="mt-1 text-xs text-muted-foreground">Ví dụ: `WELCOME30|30000` nghĩa là giảm thẳng 30,000đ.</p>
              </div>
            </div>
            <div className="shrink-0 flex justify-end gap-3 border-t border-border p-6 bg-white rounded-b-lg">
              <button onClick={() => setShowOptionsModal(false)} className="rounded border border-border px-6 py-2 transition-colors hover:bg-muted">
                Đóng
              </button>
              <button
                onClick={() => {
                  const nextCategories = categoryDraft
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const nextSizes = sizeDraft
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const nextColors = colorDraft
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const nextTags = tagDraft
                    .split(",")
                    .map((item) => item.trim().toLowerCase())
                    .filter(Boolean);

                  const nextProductOptions: ProductOptions = {
                    categories: nextCategories.length > 0 ? nextCategories : DEFAULT_PRODUCT_OPTIONS.categories,
                    sizes: nextSizes.length > 0 ? nextSizes : DEFAULT_PRODUCT_OPTIONS.sizes,
                    colors: nextColors.length > 0 ? nextColors : DEFAULT_PRODUCT_OPTIONS.colors,
                    tags: nextTags.length > 0 ? nextTags : DEFAULT_PRODUCT_OPTIONS.tags,
                  };

                  persistProductOptions(nextProductOptions);
                  const nextColorMap: Record<string, string> = {};
                  nextProductOptions.colors.forEach((colorName) => {
                    const raw = (colorHexDrafts[colorName] || "").trim();
                    nextColorMap[colorName] = normalizeHex(raw || "#D1D5DB");
                  });
                  const parsedCoupons = couponDraft
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const [codeRaw, discountRaw] = line.split("|").map((part) => part.trim());
                      const code = (codeRaw || "").toUpperCase();
                      const discountAmount = Number(discountRaw || 0);
                      return {
                        code,
                        discountAmount: Math.max(0, discountAmount),
                      } satisfies Coupon;
                    })
                    .filter((coupon) => coupon.code && coupon.discountAmount > 0);

                  saveCoupons(parsedCoupons);
                  updateSettings({ colorHexMap: { ...settings.colorHexMap, ...nextColorMap } });
                  if (!nextProductOptions.categories.includes(formData.category)) {
                    setFormData((current) => ({ ...current, category: nextProductOptions.categories[0] ?? "" }));
                  }
                  setShowOptionsModal(false);
                  showToast("Đã lưu tuỳ chọn cố định thành công.", "success");
                }}
                className="rounded bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
