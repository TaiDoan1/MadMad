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
  const { products, addProduct, updateProduct, deleteProduct, updateProductColorImages } = useProducts();
  const { settings, updateSettings } = useStorefrontSettings();
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

  const resetForm = () => {
    setFormData({ name: "", price: 0, originalPrice: 0, discountPercent: 0, category: productOptions.categories[0] ?? "", image: "", sizeChartImage: "", description: "", sizes: "", inStock: true, rating: 5, reviews: 0 });
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
    setColorImageDrafts({});
    setProductImages([""]);
    setSelectedProduct(null);
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
      })
      .sort((a, b) => b.id - a.id);
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
                    <tr key={product.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded bg-muted">
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
                        <span className={`rounded-full px-3 py-1 text-xs ${product.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {product.inStock ? "Còn hàng" : "Hết hàng"}
                        </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-border bg-white p-6 z-10">
              <h2 className="text-2xl">{showAddModal ? "Thêm Sản Phẩm Mới" : "Chỉnh Sửa Sản Phẩm"}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded p-2 transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="mb-1 text-sm text-muted-foreground">Tên sản phẩm</p>
                  <input value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Tên sản phẩm" />
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Danh mục</p>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    className="w-full rounded border border-border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {productOptions.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Giá</p>
                  <input type="number" value={formData.price} onChange={(event) => setFormData({ ...formData, price: Number(event.target.value) })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Giá" />
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Giá gốc (nếu có)</p>
                  <input type="number" value={formData.originalPrice} onChange={(event) => setFormData({ ...formData, originalPrice: Number(event.target.value) })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Giá gốc" />
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Giảm giá (%)</p>
                  <input type="number" min={0} max={99} value={formData.discountPercent} onChange={(event) => setFormData({ ...formData, discountPercent: Number(event.target.value) })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="0" />
                </div>
              </div>
              {calculatedPriceFromPercent !== null && (
                <div className="rounded border border-dashed border-border bg-muted/20 p-3">
                  <p className="text-sm text-muted-foreground">
                    Giá sau giảm theo %:{" "}
                    <span className="font-semibold text-foreground">
                      {calculatedPriceFromPercent.toLocaleString("vi-VN")}₫
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, price: calculatedPriceFromPercent }))}
                    className="mt-2 rounded bg-primary px-3 py-1.5 text-xs text-white transition-colors hover:bg-primary/90"
                  >
                    Áp dụng vào giá bán
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Tồn kho</p>
                  <select
                    value={formData.inStock ? "true" : "false"}
                    onChange={(event) => setFormData({ ...formData, inStock: event.target.value === "true" })}
                    className="w-full rounded border border-border bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Còn hàng</option>
                    <option value="false">Hết hàng</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Sizes (CSV)</p>
                  <div className="flex flex-wrap gap-2 rounded border border-border p-2">
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
                          className={`rounded px-3 py-1 text-sm transition-colors ${
                            active ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Màu sắc cố định</p>
                <div className="flex flex-wrap gap-2 rounded border border-border p-2">
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
                        className={`rounded px-3 py-1 text-sm transition-colors ${
                          active ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={newColorInput}
                    onChange={(event) => setNewColorInput(event.target.value)}
                    className="w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Thêm màu mới, ví dụ: Hồng"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nextColor = newColorInput.trim();
                      if (!nextColor) return;
                      if (productOptions.colors.includes(nextColor)) {
                        window.alert("Màu đã tồn tại.");
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
                    className="rounded bg-primary px-3 py-2 text-sm text-white transition-colors hover:bg-primary/90"
                  >
                    + Màu
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Tag cố định</p>
                <div className="flex flex-wrap gap-2 rounded border border-border p-2">
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
                        className={`rounded px-3 py-1 text-sm transition-colors ${
                          active ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedColors.length > 0 && (
                <div className="space-y-2 rounded border border-border p-3">
                  <p className="text-sm text-muted-foreground">Ảnh theo màu (tuỳ chọn)</p>
                  <p className="text-xs text-muted-foreground">Khuyến nghị: 1200x1200 (tỉ lệ 1:1) để đồng bộ trang shop/chi tiết.</p>
                  {selectedColors.map((color) => (
                    <div key={color} className="flex items-center gap-2">
                      <span className="w-24 text-sm">{color}</span>
                      <ImageUploadInput
                        value={colorImageDrafts[color] || ""}
                        onChange={(value) =>
                          setColorImageDrafts((current) => ({ ...current, [color]: value }))
                        }
                        className="w-full"
                        placeholder={`URL ảnh màu ${color}`}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Mô tả</p>
                <textarea value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Mô tả" rows={3} />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Ảnh bảng size (URL)</p>
                <ImageUploadInput
                  value={formData.sizeChartImage}
                  onChange={(value) => setFormData({ ...formData, sizeChartImage: value })}
                  placeholder="https://... (ảnh bảng size sản phẩm)"
                />
                <p className="mt-1 text-xs text-muted-foreground">Khuyến nghị bảng size: 1200x1600 (tỉ lệ 3:4), chữ rõ, nền sáng.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Ảnh sản phẩm (nhiều ảnh)</p>
                  <button
                    type="button"
                    onClick={() => setProductImages((current) => [...current, ""])}
                    className="rounded bg-muted px-3 py-1 text-sm transition-colors hover:bg-muted/80"
                  >
                    + Thêm ảnh
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gợi ý để đồng bộ hiển thị: ảnh trang shop/chi tiết dùng tỉ lệ 1:1 (vd 1200x1200), ảnh best seller trang chủ dùng tỉ lệ 4:5 (vd 1200x1500).
                </p>
                <div className="space-y-2">
                  {productImages.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
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
                          className="rounded p-2 text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => setProductImages((current) => current.filter((_, i) => i !== index))}
                          title="Xóa ảnh"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {index > 0 && (
                        <button
                          type="button"
                          className="rounded p-2 transition-colors hover:bg-muted"
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
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ảnh sản phẩm (chính + phụ): khuyến nghị 1200x1200 (tỉ lệ 1:1), cùng tông nền để đồng bộ.
                </p>
                <ImageUploadInput
                  value={formData.image}
                  onChange={(value) => setFormData({ ...formData, image: value })}
                  placeholder="Fallback ảnh chính (dùng khi chưa nhập ảnh ở trên)"
                />
                {mainImage && (
                  <div className="rounded border border-border p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Preview ảnh chính</p>
                    <ImageWithFallback src={mainImage} alt="Preview" className="h-40 w-full rounded object-cover" />
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 flex justify-end gap-3 border-t border-border p-6 bg-white rounded-b-lg">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded border border-border px-6 py-2 transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const colorImages: Record<string, string> = {};
                  selectedColors.forEach((color) => {
                    const url = (colorImageDrafts[color] || "").trim();
                    if (url) colorImages[color] = url;
                  });

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
                    inStock: formData.inStock,
                    rating: formData.rating,
                    reviews: formData.reviews,
                  };

                  if (showAddModal) addProduct(nextProduct);
                  if (showEditModal && selectedProduct) updateProduct(selectedProduct.id, nextProduct);

                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="rounded bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
              >
                {showAddModal ? "Thêm Sản Phẩm" : "Lưu Thay Đổi"}
              </button>
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
                        window.alert("Tag đã tồn tại.");
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
                  window.alert("Đã lưu tuỳ chọn cố định.");
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
