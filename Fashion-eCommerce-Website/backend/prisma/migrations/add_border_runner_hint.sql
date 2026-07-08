-- Add border-runner easter egg hint text + repeat interval (admin-configurable)
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "borderRunnerHintText" TEXT DEFAULT 'Hãy chạm vào tôi đi nè.';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "borderRunnerHintIntervalSec" INTEGER DEFAULT 5;
