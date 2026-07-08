-- Add second gallery banner slot (displayed right below the homepage marquee)
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "topBannerImagesJson" TEXT DEFAULT '[]';
