-- Add hero banner / popular category / best seller image fields to StorefrontSetting table
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroImage" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroImageScalePercent" INTEGER DEFAULT 100;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroSlideIntervalMs" INTEGER DEFAULT 6000;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroBadgeText" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroTitleLine1" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroTitleLine2" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroDescription" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroButtonText" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroOverlayOpacityLeft" INTEGER DEFAULT 60;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroOverlayOpacityMiddle" INTEGER DEFAULT 40;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroOverlayOpacityRight" INTEGER DEFAULT 60;
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroContentAlign" TEXT DEFAULT 'center';
ALTER TABLE "StorefrontSetting" ADD COLUMN "heroFontStyle" TEXT DEFAULT 'default';
ALTER TABLE "StorefrontSetting" ADD COLUMN "popularCategoryImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN "bestSellerProductIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN "bestSellerImageOverridesJson" TEXT DEFAULT '{}';
ALTER TABLE "StorefrontSetting" ADD COLUMN "colorHexMapJson" TEXT DEFAULT '{}';
