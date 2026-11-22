-- Optimistic locking cho StorefrontSetting (2 tab cùng sửa: PUT lệch version thì 409)
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
