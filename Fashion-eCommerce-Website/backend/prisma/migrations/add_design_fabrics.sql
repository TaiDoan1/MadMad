-- Cây vải cho mẫu thiết kế (DesignSample.fabrics): mảng [{name, meters, rolls}] lưu dạng JSON string (giống pdfsJson).
ALTER TABLE "DesignSample" ADD COLUMN IF NOT EXISTS "fabrics" TEXT DEFAULT '[]';
