import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

const VALID_STATUSES = ["CHUA_LAM", "DANG_LAM", "DONE"] as const;
type DesignStatus = (typeof VALID_STATUSES)[number];

const PDF_SLOTS = ["front", "back", "print", "full"] as const;
type PdfSlotKey = (typeof PDF_SLOTS)[number];

const PDF_URL_FIELD: Record<PdfSlotKey, "pdfFrontUrl" | "pdfBackUrl" | "pdfPrintUrl" | "pdfFullUrl"> = {
  front: "pdfFrontUrl",
  back: "pdfBackUrl",
  print: "pdfPrintUrl",
  full: "pdfFullUrl",
};

interface PdfSlotMeta {
  name?: string | null;
  size?: number | null;
  uploadedAt?: string | null;
}

interface PdfSlot {
  url: string | null;
  name: string | null;
  size: number | null;
  uploadedAt: string | null;
}

function parsePdfsMeta(raw: string | null | undefined): Record<string, PdfSlotMeta> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// Gộp cột url + meta JSON thành dạng pdfs {front, back, print, full} cho API trả về.
function serializeDesignSample(row: any) {
  const meta = parsePdfsMeta(row.pdfsJson);
  const pdfs: Record<PdfSlotKey, PdfSlot> = {} as Record<PdfSlotKey, PdfSlot>;
  for (const slot of PDF_SLOTS) {
    const slotMeta = meta[slot] ?? {};
    pdfs[slot] = {
      url: row[PDF_URL_FIELD[slot]] ?? null,
      name: typeof slotMeta.name === "string" ? slotMeta.name : null,
      size: typeof slotMeta.size === "number" ? slotMeta.size : null,
      uploadedAt: typeof slotMeta.uploadedAt === "string" ? slotMeta.uploadedAt : null,
    };
  }
  const out: any = { ...row };
  delete out.pdfFrontUrl;
  delete out.pdfBackUrl;
  delete out.pdfPrintUrl;
  delete out.pdfFullUrl;
  delete out.pdfsJson;
  return { ...out, pdfs };
}

function isValidStatus(value: unknown): value is DesignStatus {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

function parseSteps(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 5) return NaN;
  return n;
}

function parseDeadline(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? undefined : d;
}

// Sinh mã MM-NNN = số lớn nhất hiện có + 1, định dạng 3 chữ số.
async function generateNextCode(): Promise<string> {
  const rows = await prisma.designSample.findMany({ select: { code: true } });
  let max = 0;
  for (const row of rows) {
    const match = /^MM-(\d+)$/.exec(row.code);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `MM-${String(max + 1).padStart(3, "0")}`;
}

// Đọc pdfs client gửi: {front: {url, name, size, uploadedAt} | null, ...}
// Trả về {urls, meta} đã gộp với trạng thái hiện có (slot không gửi thì giữ nguyên).
function mergePdfs(
  input: unknown,
  current: Record<PdfSlotKey, PdfSlot>
): { urls: Record<PdfSlotKey, string | null>; meta: Record<string, PdfSlotMeta> } {
  const urls: Record<PdfSlotKey, string | null> = {
    front: current.front.url,
    back: current.back.url,
    print: current.print.url,
    full: current.full.url,
  };
  const meta: Record<string, PdfSlotMeta> = {};
  for (const slot of PDF_SLOTS) {
    const m = current[slot];
    if (m.name !== null || m.size !== null || m.uploadedAt !== null) {
      meta[slot] = { name: m.name, size: m.size, uploadedAt: m.uploadedAt };
    }
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) return { urls, meta };
  const pdfs = input as Record<string, unknown>;
  for (const slot of PDF_SLOTS) {
    if (!(slot in pdfs)) continue;
    const value = pdfs[slot];
    if (value === null || value === undefined) {
      urls[slot] = null;
      delete meta[slot];
      continue;
    }
    if (typeof value === "object") {
      const v = value as Record<string, unknown>;
      const url = typeof v.url === "string" && v.url.trim() ? v.url.trim() : null;
      urls[slot] = url;
      if (url) {
        meta[slot] = {
          name: typeof v.name === "string" ? v.name : null,
          size: typeof v.size === "number" ? v.size : null,
          uploadedAt: typeof v.uploadedAt === "string" ? v.uploadedAt : new Date().toISOString(),
        };
      } else {
        delete meta[slot];
      }
    }
  }
  return { urls, meta };
}

// Quy tắc status/steps:
// - Đủ 4 pdf url -> DONE + steps 5.
// - Gỡ 1 file khỏi mẫu DONE -> DANG_LAM.
// - Set status DONE tay -> steps 5.
// - Ưu tiên giá trị client gửi khi hợp lệ, chỉ tự sửa khi client không gửi status/steps.
function resolveStatusSteps(args: {
  clientStatus?: DesignStatus;
  clientSteps?: number;
  hasAllPdfs: boolean;
  wasDone: boolean;
  currentStatus: string;
  currentSteps: number;
}): { status: string; steps: number } {
  const status =
    args.clientStatus ??
    (args.hasAllPdfs ? "DONE" : args.wasDone && !args.hasAllPdfs ? "DANG_LAM" : args.currentStatus);
  const steps =
    args.clientSteps ?? (status === "DONE" ? 5 : args.currentSteps);
  return { status, steps };
}

// GET /api/designs — Danh sách (lọc ?status= & ?search= theo name/code/type, không phân biệt hoa thường)
router.get("/", requireAdminAuth, async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: any = {};
    if (status && isValidStatus(status)) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.designSample.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: rows.map(serializeDesignSample), total: rows.length });
  } catch (error) {
    next(error);
  }
});

// GET /api/designs/:id — Chi tiết 1 mẫu
router.get("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const row = await prisma.designSample.findUnique({ where: { id: req.params.id } });
    if (!row) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mẫu thiết kế" });
    }
    res.json({ success: true, data: serializeDesignSample(row) });
  } catch (error) {
    next(error);
  }
});

// POST /api/designs — Tạo mẫu mới (tự sinh code MM-NNN)
router.post("/", requireAdminAuth, async (req, res, next) => {
  try {
    const { name, type, assignee, deadline, status, steps, notes, pdfs } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Thiếu tên mẫu thiết kế (name)" });
    }
    if (status !== undefined && status !== null && status !== "" && !isValidStatus(status)) {
      return res.status(400).json({ success: false, message: "status không hợp lệ (CHUA_LAM / DANG_LAM / DONE)" });
    }
    const parsedSteps = parseSteps(steps);
    if (steps !== undefined && steps !== null && steps !== "" && Number.isNaN(parsedSteps)) {
      return res.status(400).json({ success: false, message: "steps phải là số nguyên 0-5" });
    }
    const parsedDeadline = parseDeadline(deadline);
    if (parsedDeadline === undefined) {
      return res.status(400).json({ success: false, message: "deadline không hợp lệ" });
    }

    const emptyPdfs: Record<PdfSlotKey, PdfSlot> = {
      front: { url: null, name: null, size: null, uploadedAt: null },
      back: { url: null, name: null, size: null, uploadedAt: null },
      print: { url: null, name: null, size: null, uploadedAt: null },
      full: { url: null, name: null, size: null, uploadedAt: null },
    };
    const merged = mergePdfs(pdfs, emptyPdfs);
    const hasAllPdfs = PDF_SLOTS.every((slot) => merged.urls[slot]);
    const { status: finalStatus, steps: finalSteps } = resolveStatusSteps({
      clientStatus: isValidStatus(status) ? status : undefined,
      clientSteps: parsedSteps,
      hasAllPdfs,
      wasDone: false,
      currentStatus: "CHUA_LAM",
      currentSteps: 0,
    });

    const code = await generateNextCode();
    const created = await prisma.designSample.create({
      data: {
        code,
        name: name.trim(),
        type: typeof type === "string" ? type.trim() : "",
        assignee: typeof assignee === "string" ? assignee.trim() : "",
        deadline: parsedDeadline ?? null,
        status: finalStatus,
        notes: typeof notes === "string" ? notes : "",
        steps: finalSteps,
        pdfFrontUrl: merged.urls.front,
        pdfBackUrl: merged.urls.back,
        pdfPrintUrl: merged.urls.print,
        pdfFullUrl: merged.urls.full,
        pdfsJson: Object.keys(merged.meta).length ? JSON.stringify(merged.meta) : null,
      },
    });
    res.status(201).json({ success: true, data: serializeDesignSample(created) });
  } catch (error) {
    next(error);
  }
});

// PUT /api/designs/:id — Cập nhật mẫu (nhận pdfs để lưu url + meta)
router.put("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const existing = await prisma.designSample.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mẫu thiết kế" });
    }

    const { name, type, assignee, deadline, status, steps, notes, pdfs } = req.body ?? {};

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ success: false, message: "name không được để trống" });
    }
    if (status !== undefined && status !== null && status !== "" && !isValidStatus(status)) {
      return res.status(400).json({ success: false, message: "status không hợp lệ (CHUA_LAM / DANG_LAM / DONE)" });
    }
    const parsedSteps = parseSteps(steps);
    if (steps !== undefined && steps !== null && steps !== "" && Number.isNaN(parsedSteps)) {
      return res.status(400).json({ success: false, message: "steps phải là số nguyên 0-5" });
    }
    const parsedDeadline = parseDeadline(deadline);
    if (parsedDeadline === undefined) {
      return res.status(400).json({ success: false, message: "deadline không hợp lệ" });
    }

    const current = serializeDesignSample(existing).pdfs;
    const merged = mergePdfs(pdfs, current);
    const hasAllPdfs = PDF_SLOTS.every((slot) => merged.urls[slot]);
    const { status: finalStatus, steps: finalSteps } = resolveStatusSteps({
      clientStatus: isValidStatus(status) ? status : undefined,
      clientSteps: parsedSteps,
      hasAllPdfs,
      wasDone: existing.status === "DONE",
      currentStatus: existing.status,
      currentSteps: existing.steps,
    });

    const data: any = {
      status: finalStatus,
      steps: finalSteps,
      pdfFrontUrl: merged.urls.front,
      pdfBackUrl: merged.urls.back,
      pdfPrintUrl: merged.urls.print,
      pdfFullUrl: merged.urls.full,
      pdfsJson: Object.keys(merged.meta).length ? JSON.stringify(merged.meta) : null,
    };
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = typeof type === "string" ? type.trim() : "";
    if (assignee !== undefined) data.assignee = typeof assignee === "string" ? assignee.trim() : "";
    if (deadline !== undefined) data.deadline = parsedDeadline ?? null;
    if (notes !== undefined) data.notes = typeof notes === "string" ? notes : "";

    const updated = await prisma.designSample.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: serializeDesignSample(updated) });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/designs/:id — Xóa mẫu
router.delete("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const existing = await prisma.designSample.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mẫu thiết kế" });
    }
    await prisma.designSample.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Đã xóa mẫu thiết kế" });
  } catch (error) {
    next(error);
  }
});

export default router;
