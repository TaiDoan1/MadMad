-- Bảng Mẫu thiết kế (DesignSample) — quản lý mẫu thiết kế MadMad.
CREATE TABLE IF NOT EXISTS "DesignSample" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "assignee" TEXT NOT NULL,
  "deadline" TIMESTAMPTZ,
  "status" TEXT NOT NULL DEFAULT 'CHUA_LAM',
  "notes" TEXT DEFAULT '',
  "steps" INTEGER NOT NULL DEFAULT 0,
  "pdfFrontUrl" TEXT,
  "pdfBackUrl" TEXT,
  "pdfPrintUrl" TEXT,
  "pdfFullUrl" TEXT,
  "pdfsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignSample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DesignSample_code_key" ON "DesignSample"("code");

-- Seed 5 mẫu thật (chạy lại an toàn nhờ ON CONFLICT DO NOTHING).
INSERT INTO "DesignSample" ("id", "code", "name", "type", "assignee", "deadline", "status", "notes", "steps", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'MM-001', 'Áo wash xám — Carpe Diem, Ad Astra', 'Áo thun', 'Design', '2026-11-20T00:00:00+07:00', 'DANG_LAM', 'Chữ Carpe Diem, Ad Astra 3 dòng lặp + MADMAD nhỏ căn phải. In lụa thấm mực trắng. 2 bảng chữ mỏng/dày.', 5, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DesignSample" ("id", "code", "name", "type", "assignee", "deadline", "status", "notes", "steps", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'MM-002', 'Áo raglan tay dài xanh bơ — Daily Life 99', 'Áo tay dài', 'Design', '2026-11-28T00:00:00+07:00', 'DANG_LAM', 'Form boxy cropped, thân trắng kem, tay + panel vai + cổ xanh bơ nhạt RGB 180,182,150. Hình in ngực Daily Life, số 99, Painful Listen.', 3, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DesignSample" ("id", "code", "name", "type", "assignee", "deadline", "status", "notes", "steps", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'MM-003', 'Hình in ngôi sao đỏ ở ngực', 'Áo thun', 'Cả hai', '2026-11-30T00:00:00+07:00', 'CHUA_LAM', 'Ngôi sao đỏ lỗ trắng ở giữa, in thấm chiếm 90% khung ngực.', 2, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DesignSample" ("id", "code", "name", "type", "assignee", "deadline", "status", "notes", "steps", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'MM-004', 'MAKE YOUR MARK — navy oversize', 'Áo thun', 'Design', '2026-11-10T00:00:00+07:00', 'DONE', 'Áo navy oversize, đã xong. File PDF gốc cần up lại.', 5, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DesignSample" ("id", "code", "name", "type", "assignee", "deadline", "status", "notes", "steps", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'MM-005', 'DON''T JUST EXIST — xanh navy vàng', 'Áo thun', 'Design', '2026-11-05T00:00:00+07:00', 'DONE', 'Áo xanh navy-vàng, đã xong. File PDF gốc cần up lại.', 5, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;
