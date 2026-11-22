-- Lỗi client gần nhất (ghi qua POST /api/client-errors, giữ tối đa ~200 dòng, đọc qua GET /api/client-errors)
CREATE TABLE IF NOT EXISTS "ClientError" (
  "id" SERIAL PRIMARY KEY,
  "message" TEXT NOT NULL,
  "path" TEXT,
  "occurredAt" TIMESTAMPTZ,
  "stack" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
