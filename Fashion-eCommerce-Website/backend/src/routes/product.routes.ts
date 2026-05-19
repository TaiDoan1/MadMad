import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

// Helper: serialize/parse images array
const serializeImages = (images: any): string => {
  if (!images) return "[]";
  if (Array.isArray(images)) return JSON.stringify(images.filter(Boolean));
  if (typeof images === "string") {
    try { JSON.parse(images); return images; } catch { return "[]"; }
  }
  return "[]";
};

const parseProduct = (p: any) => ({
  ...p,
  sizes: p.sizes ? p.sizes.split(",") : [],
  colors: p.colors ? p.colors.split(",") : [],
  colorImages: p.colorImages ? JSON.parse(p.colorImages) : {},
  images: p.images ? JSON.parse(p.images) : [],
});

// 1. GET /api/products - Lấy danh sách sản phẩm (có lọc theo category)
router.get("/", async (req, res, next) => {
  try {
    const { category, featured } = req.query;
    const whereClause: any = {};
    if (category && category !== "all") whereClause.category = String(category);
    if (featured === "true") whereClause.isFeatured = true;

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }]
    });

    res.json(products.map(parseProduct));
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/products/:id - Chi tiết sản phẩm
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json(parseProduct(product));
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/products - Tạo sản phẩm mới (Admin)
router.post("/", async (req, res, next) => {
  try {
    const { name, sku, price, image, category, description, sizes, colors, colorImages, images, isFeatured } = req.body;

    if (!name || !sku || !price || !image || !category) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc!" });
    }

    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes || "S,M,L");
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors || "Black");
    const colorImagesStr = typeof colorImages === "object" && colorImages !== null ? JSON.stringify(colorImages) : String(colorImages || "{}");
    const imagesStr = serializeImages(images);

    const newProduct = await prisma.product.create({
      data: {
        name,
        sku,
        price: Number(price),
        image,
        category,
        description: description || "",
        sizes: sizesStr,
        colors: colorsStr,
        colorImages: colorImagesStr,
        images: imagesStr,
        isFeatured: !!isFeatured
      }
    });

    res.status(201).json(parseProduct(newProduct));
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Mã SKU này đã tồn tại!" });
    }
    next(error);
  }
});

// 4. PUT /api/products/:id - Cập nhật sản phẩm (Admin)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, price, image, category, description, sizes, colors, colorImages, images, isFeatured } = req.body;

    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes || "");
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors || "");
    const colorImagesStr = typeof colorImages === "object" && colorImages !== null ? JSON.stringify(colorImages) : String(colorImages || "{}");
    const imagesStr = serializeImages(images);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        price: price ? Number(price) : undefined,
        image,
        category,
        description,
        sizes: sizesStr,
        colors: colorsStr,
        colorImages: colorImagesStr,
        images: imagesStr,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined
      }
    });

    res.json(parseProduct(updatedProduct));
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/products/:id - Xóa sản phẩm (Admin)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error) {
    next(error);
  }
});

// 6. PUT /api/products/reorder - Sắp xếp lại thứ tự sản phẩm
router.put("/reorder", async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "Dữ liệu không hợp lệ" });

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.product.update({ where: { id: item.id }, data: { orderIndex: item.orderIndex } })
      )
    );

    res.json({ success: true, message: "Cập nhật thứ tự thành công" });
  } catch (error) {
    next(error);
  }
});

export default router;
