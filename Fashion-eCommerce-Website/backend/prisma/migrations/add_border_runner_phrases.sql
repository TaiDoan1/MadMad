-- Add border-runner click-response phrases list (admin-configurable)
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "borderRunnerPhrasesJson" TEXT DEFAULT '[]';
