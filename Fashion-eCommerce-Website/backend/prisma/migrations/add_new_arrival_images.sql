-- Ảnh New Arrival (Shop the Look) cho trang chủ
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "newArrivalImagesJson" TEXT DEFAULT '[]';
