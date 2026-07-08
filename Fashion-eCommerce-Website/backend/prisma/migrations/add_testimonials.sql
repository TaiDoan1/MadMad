-- Add customer testimonials field to StorefrontSetting table
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "testimonialsJson" TEXT DEFAULT '[]';
