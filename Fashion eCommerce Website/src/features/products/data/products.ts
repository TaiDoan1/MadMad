import type { Product, ProductCategory } from "@/types/product";

export const products: Product[] = [
  {
    id: 1,
    name: "Áo Thun Oversize Logo Chữ M",
    price: 350000,
    originalPrice: 450000,
    discountPercent: 22,
    tags: ["new"],
    category: "Áo Thun",
    image: "/assets/products/ao-thun-m-trang.jpg", // Ảnh chính là áo màu trắng
    images: [
      "/assets/products/ao-thun-m-trang.jpg",
      "/assets/products/ao-thun-m-den.jpg",
      "/assets/products/ao-thun-m-xam.jpg",
    ],
    rating: 5.0,
    reviews: 0,
    description: "Áo thun oversize chất cotton, in logo chữ M màu đỏ nổi bật ở ngực trái.",
    sizes: ["M", "L", "XL"],
    colors: ["Trắng", "Đen", "Xám"],
    inStock: true,
  },
  {
    id: 2,
    name: "Áo Thun Trơn Basic (SP2)",
    price: 350000,
    originalPrice: 450000,
    discountPercent: 22,
    tags: ["new"],
    category: "Áo Thun",
    image: "/assets/products/sp2-trang.jpg",
    images: [
      "/assets/products/sp2-trang.jpg",
      "/assets/products/sp2-den.jpg",
      "/assets/products/sp2-xam.jpg",
    ],
    rating: 5.0,
    reviews: 0,
    description: "Áo thun basic dễ phối đồ. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).",
    sizes: ["M", "L", "XL"],
    colors: ["Trắng", "Đen", "Xám"],
    inStock: true,
  },
  {
    id: 3,
    name: "Áo Thun Sản Phẩm 3 (Navy)",
    price: 350000,
    originalPrice: 450000,
    discountPercent: 22,
    tags: ["new"],
    category: "Áo Thun",
    image: "/assets/products/sp3-navy.jpg",
    images: [
      "/assets/products/sp3-navy.jpg",
    ],
    rating: 5.0,
    reviews: 0,
    description: "Áo thun màu navy basic. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).",
    sizes: ["M", "L", "XL"],
    colors: ["Navy"],
    inStock: true,
  },
  {
    id: 4,
    name: "Sản Phẩm 4",
    price: 350000,
    originalPrice: 450000,
    discountPercent: 22,
    tags: ["new"],
    category: "Áo Thun",
    image: "https://down-vn.img.susercontent.com/file/0a56b341273dfcb3bc27fcfa91f0c693",
    images: [
      "https://down-vn.img.susercontent.com/file/0a56b341273dfcb3bc27fcfa91f0c693",
    ],
    rating: 5.0,
    reviews: 0,
    description: "Mô tả cho sản phẩm 4. (Bạn có thể cập nhật lại tên và mô tả chi tiết sau nhé).",
    sizes: ["M", "L", "XL"],
    colors: ["Default"],
    inStock: true,
  },
];

export const categories: ProductCategory[] = [
  {
    name: "Váy",
    image:
      "https://images.unsplash.com/photo-1764265148862-7ee72a4fb367?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxlbGVnYW50JTIwZHJlc3MlMjBmYXNoaW9ufGVufDF8fHx8MTc3Njc5NDY1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    name: "Áo Thun",
    image:
      "https://images.unsplash.com/photo-1775836214306-6a9bc4a464d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxjYXN1YWwlMjBzdHJlZXR3ZWFyJTIwZmFzaGlvbnxlbnwxfHx8fDE3NzY3OTQ2NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    name: "Áo Khoác",
    image:
      "https://images.unsplash.com/photo-1723488994264-a4c91a5f3a43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxmYXNoaW9uJTIwbW9kZWwlMjBzdW1tZXIlMjBzdHlsZXxlbnwxfHx8fDE3NzY3OTQ2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    name: "Áo Sơ Mi",
    image:
      "https://images.unsplash.com/photo-1542731764-7d0f5660b7e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwbW9kZWwlMjBzdW1tZXIlMjBzdHlsZXxlbnwxfHx8fDE3NzY3OTQ2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    name: "Nữ",
    image:
      "https://images.unsplash.com/photo-1557161622-5f50ca344787?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwZHJlc3MlMjBmYXNoaW9ufGVufDF8fHx8MTc3Njc5NDY1Nnww&ixlib=rb-4.1.0&q=80&w=1080",
  },
];
