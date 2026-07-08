-- Add sizeChartImage column to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sizeChartImage" TEXT;
