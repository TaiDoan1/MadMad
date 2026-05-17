import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

// 1. GET /api/products - Lấy danh sách sản phẩm (có lọc theo category)
router.get("/", async (req, res, next) => {
  try {
    const { category, featured } = req.query;
    
    const whereClause: any = {};
    
    if (category && category !== "all") {
      whereClause.category = String(category);
    }
    
    if (featured === "true") {
      whereClause.isFeatured = true;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });

    // Parse JSON strings của sizes, colors, colorImages trước khi trả về
    const parsedProducts = products.map(p => ({
      ...p,
      sizes: p.sizes ? p.sizes.split(",") : [],
      colors: p.colors ? p.colors.split(",") : [],
      colorImages: p.colorImages ? JSON.parse(p.colorImages) : {}
    }));

    res.json(parsedProducts);
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/products/:id - Chi tiết sản phẩm
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.json({
      ...product,
      sizes: product.sizes ? product.sizes.split(",") : [],
      colors: product.colors ? product.colors.split(",") : [],
      colorImages: product.colorImages ? JSON.parse(product.colorImages) : {}
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/products - Tạo sản phẩm mới (Admin)
router.post("/", async (req, res, next) => {
  try {
    const { name, sku, price, image, category, description, sizes, colors, colorImages, isFeatured } = req.body;

    if (!name || !sku || !price || !image || !category) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc!" });
    }

    // Convert sizes và colors thành string ngăn cách bởi dấu phẩy
    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes || "S,M,L");
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors || "Black");
    const colorImagesStr = typeof colorImages === "object" ? JSON.stringify(colorImages) : String(colorImages || "{}");

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
        isFeatured: !!isFeatured
      }
    });

    res.status(201).json(newProduct);
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
    const { name, sku, price, image, category, description, sizes, colors, colorImages, isFeatured } = req.body;

    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes);
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors);
    const colorImagesStr = typeof colorImages === "object" ? JSON.stringify(colorImages) : String(colorImages);

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
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined
      }
    });

    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/products/:id - Xóa sản phẩm (Admin)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id }
    });
    res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error) {
    next(error);
  }
});

export default router;
