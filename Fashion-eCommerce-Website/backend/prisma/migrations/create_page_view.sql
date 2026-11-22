-- Lượt xem trang gom theo ngày (giờ Việt Nam, tính ở server) + đường dẫn.
-- KHÔNG thu thập IP, user agent hay id người dùng.
CREATE TABLE IF NOT EXISTS "PageView" (
  "id" SERIAL PRIMARY KEY,
  "day" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PageView_day_path_key" UNIQUE ("day", "path")
);
