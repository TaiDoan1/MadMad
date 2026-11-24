-- Add accordion banner image slot (single homepage accordion strip, replaces tote banner)
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "accordionBannerImage" TEXT;
