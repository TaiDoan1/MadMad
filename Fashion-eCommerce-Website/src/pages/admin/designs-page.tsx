// Trang Quản trị — Quản lý mẫu thiết kế.
// Dữ liệu thật từ backend (GET/POST/PUT/DELETE /api/designs, header x-admin-key).
// File PDF up thẳng lên Cloudinary (signed upload, resource_type raw, folder
// madmad-designs) rồi lưu secure_url về backend qua PUT /api/designs/:id.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Download,
  Eye,
  FileText,
  FileUp,
  Palette,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { API_URL, getAdminKey } from "@/config/api";
import { useToast } from "@/components/common/toast";

export type DesignStatus = "CHUA_LAM" | "DANG_LAM" | "DONE";

export type DesignPdf = {
  url: string;
  name: string;
  size: number;
  uploadedAt: string;
};

export type DesignPdfSlot = "front" | "back" | "print" | "full";

// Một dòng vải dùng cho mẫu: tên vải + số mét + số cây.
// Số mét / số cây để trống ở form được lưu thành 0 (backend validate >= 0).
export type DesignFabric = {
  name: string;
  meters: number;
  rolls: number;
};

// Bản nháp khi nhập trong popup: số mét / số cây giữ dạng chuỗi để cho phép
// để trống, chỉ chuyển sang number lúc bấm Lưu.
export type FabricDraft = {
  name: string;
  meters: string;
  rolls: string;
};

export type Design = {
  id: string;
  code: string;
  name: string;
  type: string;
  assignee: string;
  deadline: string | null;
  status: DesignStatus;
  notes: string;
  steps: number;
  pdfs: Record<DesignPdfSlot, DesignPdf | null>;
  fabrics: DesignFabric[];
  createdAt?: string;
  updatedAt?: string;
};

const STATUS_LABELS: Record<DesignStatus, string> = {
  CHUA_LAM: "Chưa làm",
  DANG_LAM: "Đang làm",
  DONE: "Đã xong",
};

const STATUS_ORDER: DesignStatus[] = ["CHUA_LAM", "DANG_LAM", "DONE"];

const STEP_LABELS = ["Lên ý tưởng", "Vẽ mẫu / hình in", "Chốt thông số in", "Mockup", "Chốt file in"];

const PDF_SLOTS: { key: DesignPdfSlot; label: string }[] = [
  { key: "front", label: "File mặt trước" },
  { key: "back", label: "File mặt sau" },
  { key: "print", label: "File hình in" },
  { key: "full", label: "File đầy đủ" },
];

const PRODUCT_TYPES = ["Áo thun", "Áo tay dài", "Hoodie", "Áo khoác", "Tank top", "Phụ kiện", "Khác"];

const ASSIGNEE_SUGGESTIONS = ["Design", "Tài", "Cả hai"];

const STATUS_BADGE_CLASS: Record<DesignStatus, string> = {
  CHUA_LAM: "bg-gray-100 text-gray-700",
  DANG_LAM: "bg-amber-100 text-amber-800",
  DONE: "bg-green-100 text-green-800",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOverdue(design: Design): boolean {
  if (!design.deadline || design.status === "DONE") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(design.deadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline.getTime() < today.getTime();
}

function countPdfs(design: Design): number {
  return PDF_SLOTS.filter((slot) => design.pdfs?.[slot.key]).length;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeFabric(raw: unknown): DesignFabric {
  const item = (raw ?? {}) as Record<string, unknown>;
  const meters = Number(item.meters ?? 0);
  const rolls = Number(item.rolls ?? 0);
  return {
    name: String(item.name ?? ""),
    meters: Number.isFinite(meters) && meters > 0 ? meters : 0,
    rolls: Number.isFinite(rolls) && rolls > 0 ? rolls : 0,
  };
}

// Dữ liệu vải từ backend (mảng JSON) -> bản nháp cho form trong popup.
function toFabricDrafts(fabrics: DesignFabric[] | undefined): FabricDraft[] {
  return (fabrics ?? []).map((fabric) => ({
    name: fabric.name ?? "",
    meters: fabric.meters ? String(fabric.meters) : "",
    rolls: fabric.rolls ? String(fabric.rolls) : "",
  }));
}

// Bản nháp -> payload gửi kèm PUT: bỏ dòng trống hoàn toàn, số để trống
// thành 0, số âm kẹp về 0.
function toFabricPayload(drafts: FabricDraft[]): DesignFabric[] {
  return drafts
    .filter((draft) => draft.name.trim() !== "" || draft.meters.trim() !== "" || draft.rolls.trim() !== "")
    .map((draft) => {
      const meters = Number.parseFloat(draft.meters);
      const rolls = Number.parseFloat(draft.rolls);
      return {
        name: draft.name.trim(),
        meters: Number.isFinite(meters) && meters > 0 ? meters : 0,
        rolls: Number.isFinite(rolls) && rolls > 0 ? rolls : 0,
      };
    });
}

function normalizeDesign(raw: Record<string, unknown>): Design {
  const pdfs = (raw.pdfs ?? {}) as Record<string, DesignPdf | null | undefined>;
  return {
    id: String(raw.id ?? ""),
    code: String(raw.code ?? ""),
    name: String(raw.name ?? ""),
    type: String(raw.type ?? ""),
    assignee: String(raw.assignee ?? ""),
    deadline: raw.deadline ? String(raw.deadline) : null,
    status: (["CHUA_LAM", "DANG_LAM", "DONE"].includes(String(raw.status)) ? raw.status : "CHUA_LAM") as DesignStatus,
    notes: String(raw.notes ?? ""),
    steps: Math.max(0, Math.min(5, Number(raw.steps ?? 0) || 0)),
    pdfs: {
      front: pdfs.front ?? null,
      back: pdfs.back ?? null,
      print: pdfs.print ?? null,
      full: pdfs.full ?? null,
    },
    fabrics: Array.isArray(raw.fabrics) ? raw.fabrics.map(normalizeFabric) : [],
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "x-admin-key": getAdminKey(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Yêu cầu thất bại (HTTP ${res.status}).`;
    try {
      const data = (await res.json()) as { message?: string; error?: string };
      if (data.message || data.error) message = String(data.message ?? data.error);
    } catch {
      // Giữ message mặc định.
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type UploadSignature = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  resource_type?: string;
  upload_url: string;
};

// Xin chữ ký up PDF (raw) rồi up thẳng lên Cloudinary bằng XHR để báo tiến trình.
function uploadPdfToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ secure_url: string; bytes: number }> {
  return (async () => {
    const sigRes = await fetch(`${API_URL}/settings/upload-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": getAdminKey() },
      body: JSON.stringify({ folder: "madmad-designs", resource_type: "raw" }),
    });
    if (!sigRes.ok) throw new Error(`Không xin được chữ ký upload (HTTP ${sigRes.status}).`);
    const sig = (await sigRes.json()) as UploadSignature;

    return new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.api_key);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      form.append("resource_type", "raw");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", sig.upload_url);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText) as { secure_url?: string; bytes?: number; error?: { message?: string } };
          if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
            resolve({ secure_url: data.secure_url, bytes: data.bytes ?? file.size });
          } else {
            reject(new Error(data.error?.message || `Tải file PDF thất bại (HTTP ${xhr.status}).`));
          }
        } catch {
          reject(new Error(`Tải file PDF thất bại (HTTP ${xhr.status}).`));
        }
      };
      xhr.onerror = () => reject(new Error("Mất kết nối khi tải file PDF lên."));
      xhr.send(form);
    });
  })();
}

export function AdminDesignsPage() {
  const { showToast } = useToast();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DesignStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const [selected, setSelected] = useState<Design | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<DesignPdfSlot | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Bản nháp "Cây vải" trong popup chi tiết. Chỉ lưu khi bấm "Lưu cây vải"
  // (gửi kèm 1 lần PUT như các trường khác), không tự lưu khi gõ.
  const [fabricDrafts, setFabricDrafts] = useState<FabricDraft[]>([]);
  const [fabricsDirty, setFabricsDirty] = useState(false);
  const [isSavingFabrics, setIsSavingFabrics] = useState(false);
  const selectedFabricIdRef = useRef<string | null>(null);

  // Form thêm mẫu mới.
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState(PRODUCT_TYPES[0]);
  const [formAssignee, setFormAssignee] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formSteps, setFormSteps] = useState(0);
  const [formNotes, setFormNotes] = useState("");

  const fileInputs = useRef<Record<DesignPdfSlot, HTMLInputElement | null>>({
    front: null,
    back: null,
    print: null,
    full: null,
  });

  const loadDesigns = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      const query = params.toString();
      const data = await apiRequest<unknown>(`/designs${query ? `?${query}` : ""}`);
      const list = Array.isArray(data) ? data : ((data as { designs?: unknown[] }).designs ?? []);
      setDesigns((list as Record<string, unknown>[]).map(normalizeDesign));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không tải được danh sách mẫu thiết kế.");
      setDesigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // Đóng popup bằng phím Esc.
  useEffect(() => {
    if (!selected && !showAddForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setShowAddForm(false);
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, showAddForm]);

  // Đồng bộ bản nháp "Cây vải" khi mở popup của một mẫu khác. Chỉ chạy khi
  // đổi mẫu (so id), để các lần PUT khác (PDF/trạng thái/bước) cập nhật
  // `selected` không làm mất phần vải đang sửa dở.
  useEffect(() => {
    if (selected?.id !== selectedFabricIdRef.current) {
      selectedFabricIdRef.current = selected?.id ?? null;
      setFabricDrafts(toFabricDrafts(selected?.fabrics));
      setFabricsDirty(false);
    }
  }, [selected]);

  const fabricTotals = useMemo(() => {
    let meters = 0;
    let rolls = 0;
    for (const draft of fabricDrafts) {
      const m = Number.parseFloat(draft.meters);
      const r = Number.parseFloat(draft.rolls);
      if (Number.isFinite(m) && m > 0) meters += m;
      if (Number.isFinite(r) && r > 0) rolls += r;
    }
    return { meters, rolls };
  }, [fabricDrafts]);

  const updateFabricDraft = useCallback((index: number, patch: Partial<FabricDraft>) => {
    setFabricDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
    setFabricsDirty(true);
  }, []);

  const handleAddFabricRow = useCallback(() => {
    setFabricDrafts((prev) => [...prev, { name: "", meters: "", rolls: "" }]);
    setFabricsDirty(true);
  }, []);

  const handleRemoveFabricRow = useCallback((index: number) => {
    setFabricDrafts((prev) => prev.filter((_, i) => i !== index));
    setFabricsDirty(true);
  }, []);

  const handleResetFabrics = useCallback(() => {
    setFabricDrafts(toFabricDrafts(selected?.fabrics));
    setFabricsDirty(false);
  }, [selected]);

  const stats = useMemo(() => {
    const total = designs.length;
    const chuaLam = designs.filter((d) => d.status === "CHUA_LAM").length;
    const dangLam = designs.filter((d) => d.status === "DANG_LAM").length;
    const done = designs.filter((d) => d.status === "DONE").length;
    const donePercent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, chuaLam, dangLam, done, donePercent };
  }, [designs]);

  const tabCounts = useMemo(
    () => ({
      ALL: designs.length,
      CHUA_LAM: stats.chuaLam,
      DANG_LAM: stats.dangLam,
      DONE: stats.done,
    }),
    [designs.length, stats],
  );

  // Lọc thêm ở client để tìm kiếm theo tên / loại / mã luôn đúng kể cả khi
  // backend chưa hỗ trợ ?search=.
  const visibleDesigns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return designs.filter((design) => {
      if (statusFilter !== "ALL" && design.status !== statusFilter) return false;
      if (!q) return true;
      return (
        design.name.toLowerCase().includes(q) ||
        design.type.toLowerCase().includes(q) ||
        design.code.toLowerCase().includes(q)
      );
    });
  }, [designs, statusFilter, searchTerm]);

  const applyDesignUpdate = useCallback((updated: Design) => {
    setDesigns((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const updateDesign = useCallback(
    async (design: Design, patch: Partial<Design>): Promise<Design> => {
      const body: Record<string, unknown> = { ...patch };
      const data = await apiRequest<Record<string, unknown>>(`/designs/${design.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const updated = normalizeDesign({ ...design, ...patch, ...(data ?? {}) } as Record<string, unknown>);
      applyDesignUpdate(updated);
      return updated;
    },
    [applyDesignUpdate],
  );

  // Quy tắc tự động khi PDF thay đổi:
  // - Up file đầu tiên: Chưa làm -> Đang làm.
  // - Up đủ 4/4: Đã xong + steps = 5.
  // - Gỡ 1 file khỏi mẫu Đã xong: về Đang làm.
  const savePdfChange = useCallback(
    async (design: Design, slot: DesignPdfSlot, pdf: DesignPdf | null) => {
      const nextPdfs = { ...design.pdfs, [slot]: pdf };
      const pdfCount = PDF_SLOTS.filter((s) => nextPdfs[s.key]).length;
      const patch: Partial<Design> = { pdfs: nextPdfs };
      if (pdfCount === 4) {
        patch.status = "DONE";
        patch.steps = 5;
      } else if (pdf && design.status === "CHUA_LAM") {
        patch.status = "DANG_LAM";
      } else if (!pdf && design.status === "DONE") {
        patch.status = "DANG_LAM";
      }
      return updateDesign(design, patch);
    },
    [updateDesign],
  );

  const handlePdfFile = useCallback(
    async (design: Design, slot: DesignPdfSlot, file: File | undefined) => {
      if (!file) return;
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        showToast("Chỉ chấp nhận file PDF. Vui lòng chọn file .pdf.", "error");
        return;
      }
      setUploadingSlot(slot);
      setUploadProgress(0);
      try {
        const uploaded = await uploadPdfToCloudinary(file, setUploadProgress);
        const pdf: DesignPdf = {
          url: uploaded.secure_url,
          name: file.name,
          size: uploaded.bytes,
          uploadedAt: new Date().toISOString(),
        };
        const updated = await savePdfChange(design, slot, pdf);
        const pdfCount = countPdfs(updated);
        showToast(
          pdfCount === 4
            ? "Đã up đủ 4/4 file PDF — mẫu chuyển sang Đã xong."
            : `Đã up ${PDF_SLOTS.find((s) => s.key === slot)?.label ?? "file PDF"}.`,
        );
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Tải file PDF thất bại.", "error");
      } finally {
        setUploadingSlot(null);
        setUploadProgress(0);
      }
    },
    [savePdfChange, showToast],
  );

  const handleRemovePdf = useCallback(
    async (design: Design, slot: DesignPdfSlot) => {
      try {
        await savePdfChange(design, slot, null);
        showToast("Đã gỡ file PDF.");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gỡ file thất bại.", "error");
      }
    },
    [savePdfChange, showToast],
  );

  const handleSetStatus = useCallback(
    async (design: Design, status: DesignStatus) => {
      if (design.status === status) return;
      setIsSaving(true);
      try {
        // Set tay Đã xong thì steps = 5.
        const patch: Partial<Design> = { status };
        if (status === "DONE") patch.steps = 5;
        await updateDesign(design, patch);
        showToast(`Đã chuyển mẫu sang “${STATUS_LABELS[status]}”.`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Đổi trạng thái thất bại.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [updateDesign, showToast],
  );

  const handleSetSteps = useCallback(
    async (design: Design, steps: number) => {
      if (design.steps === steps) return;
      setIsSaving(true);
      try {
        await updateDesign(design, { steps });
        showToast(`Đã cập nhật tiến độ: bước ${steps}/5.`);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Cập nhật tiến độ thất bại.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [updateDesign, showToast],
  );

  const handleSaveFabrics = useCallback(async () => {
    if (!selected) return;
    const fabrics = toFabricPayload(fabricDrafts);
    setIsSavingFabrics(true);
    try {
      await updateDesign(selected, { fabrics });
      // Đồng bộ lại bản nháp với dữ liệu đã lưu (dòng trống hoàn toàn đã
      // bị lược, số để trống thành 0).
      setFabricDrafts(toFabricDrafts(fabrics));
      setFabricsDirty(false);
      showToast("Đã lưu cây vải.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Lưu cây vải thất bại.", "error");
    } finally {
      setIsSavingFabrics(false);
    }
  }, [selected, fabricDrafts, updateDesign, showToast]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await apiRequest(`/designs/${selected.id}`, { method: "DELETE" });
      setDesigns((prev) => prev.filter((d) => d.id !== selected.id));
      showToast("Đã xóa mẫu thiết kế.");
      setSelected(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Xóa mẫu thất bại.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [selected, showToast]);

  const resetAddForm = () => {
    setFormName("");
    setFormType(PRODUCT_TYPES[0]);
    setFormAssignee("");
    setFormDeadline("");
    setFormSteps(0);
    setFormNotes("");
  };

  const handleCreate = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!formName.trim()) {
        showToast("Vui lòng nhập tên mẫu.", "error");
        return;
      }
      setIsSaving(true);
      try {
        const data = await apiRequest<Record<string, unknown>>("/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            assignee: formAssignee.trim(),
            deadline: formDeadline ? new Date(`${formDeadline}T00:00:00`).toISOString() : null,
            steps: formSteps,
            notes: formNotes.trim(),
          }),
        });
        const created = normalizeDesign(data);
        setDesigns((prev) => [created, ...prev]);
        showToast(`Đã thêm mẫu mới${created.code ? ` ${created.code}` : ""}.`);
        resetAddForm();
        setShowAddForm(false);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Thêm mẫu thất bại.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [formName, formType, formAssignee, formDeadline, formSteps, formNotes, showToast],
  );

  const openCard = (design: Design) => {
    setShowDeleteConfirm(false);
    selectedFabricIdRef.current = design.id;
    setFabricDrafts(toFabricDrafts(design.fabrics));
    setFabricsDirty(false);
    setSelected(design);
  };

  const statCards = [
    { label: "Tổng mẫu", value: stats.total, sub: `${stats.done}/${stats.total} mẫu đã xong` },
    { label: "Chưa làm", value: stats.chuaLam, sub: "Chưa bắt đầu" },
    { label: "Đang làm", value: stats.dangLam, sub: "Đang triển khai" },
    { label: "Đã xong", value: stats.done, sub: `${stats.donePercent}% hoàn thành` },
  ];

  const tabs: { key: "ALL" | DesignStatus; label: string }[] = [
    { key: "ALL", label: "Tất cả" },
    { key: "CHUA_LAM", label: "Chưa làm" },
    { key: "DANG_LAM", label: "Đang làm" },
    { key: "DONE", label: "Đã xong" },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + tiêu đề */}
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          MADMAD / Trang quản trị / Quản lý mẫu thiết kế
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6" />
            Quản lý mẫu thiết kế
          </h1>
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Thêm mẫu mới
          </button>
        </div>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab lọc + tìm kiếm */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo trạng thái">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-foreground hover:bg-muted"
              }`}
            >
              {tab.label} ({tabCounts[tab.key]})
            </button>
          ))}
        </div>
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Tìm kiếm mẫu thiết kế</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên, loại, mã mẫu…"
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      {/* Lưới card mẫu */}
      {isLoading ? (
        <p className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách mẫu thiết kế…
        </p>
      ) : loadError ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-sm text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={loadDesigns}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Thử lại
          </button>
        </div>
      ) : visibleDesigns.length === 0 ? (
        <p className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground">
          Chưa có mẫu thiết kế nào phù hợp.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDesigns.map((design) => {
            const pdfCount = countPdfs(design);
            const overdue = isOverdue(design);
            return (
              <article
                key={design.id}
                role="button"
                tabIndex={0}
                aria-label={`Xem chi tiết mẫu ${design.code} ${design.name}`}
                onClick={() => openCard(design)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCard(design);
                  }
                }}
                className="cursor-pointer rounded-lg border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold">{design.code || "—"}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      PDF: {pdfCount}/4 file
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[design.status]}`}>
                      {STATUS_LABELS[design.status]}
                    </span>
                  </span>
                </div>

                <h2 className="mt-2 line-clamp-2 min-h-[2.5rem] text-base font-semibold leading-snug">{design.name}</h2>

                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Loại</dt>
                    <dd className="mt-0.5 font-medium">{design.type || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phụ trách</dt>
                    <dd className="mt-0.5 font-medium">{design.assignee || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hạn hoàn thành</dt>
                    <dd className={`mt-0.5 font-medium ${overdue ? "text-red-600" : ""}`}>
                      {formatDate(design.deadline)}
                      {overdue && <span className="block text-[11px] font-semibold">Quá hạn</span>}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  Xem chi tiết &amp; up file PDF
                  <Eye className="h-3.5 w-3.5" />
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Popup chi tiết mẫu */}
      {selected &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onClick={() => setSelected(null)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Chi tiết mẫu ${selected.code} ${selected.name}`}
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{selected.code || "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[selected.status]}`}>
                      {STATUS_LABELS[selected.status]}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      PDF: {countPdfs(selected)}/4 file
                    </span>
                    {isOverdue(selected) && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Quá hạn
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-bold leading-snug">{selected.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Đóng"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Loại</dt>
                  <dd className="mt-0.5 font-medium">{selected.type || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phụ trách</dt>
                  <dd className="mt-0.5 font-medium">{selected.assignee || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Hạn hoàn thành</dt>
                  <dd className={`mt-0.5 font-medium ${isOverdue(selected) ? "text-red-600" : ""}`}>
                    {formatDate(selected.deadline)}
                  </dd>
                </div>
              </dl>

              {selected.notes && (
                <div className="mt-4">
                  <p className="text-sm font-semibold">Ghi chú</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Tiến độ 5 bước */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">Tiến độ</p>
                  <p className="text-muted-foreground">
                    Đang ở bước {selected.steps}/5
                    {selected.steps > 0 && selected.steps <= 5 ? ` · ${STEP_LABELS[selected.steps - 1]}` : ""}
                  </p>
                </div>
                <div className="mt-2 flex gap-1.5" role="group" aria-label="Đổi bước tiến độ">
                  {STEP_LABELS.map((label, index) => {
                    const stepNumber = index + 1;
                    const done = selected.steps >= stepNumber;
                    return (
                      <button
                        key={label}
                        type="button"
                        title={`Bước ${stepNumber}: ${label}`}
                        aria-label={`Đặt tiến độ bước ${stepNumber}: ${label}`}
                        aria-pressed={done}
                        disabled={isSaving}
                        onClick={() => void handleSetSteps(selected, stepNumber === selected.steps ? stepNumber - 1 : stepNumber)}
                        className={`h-2.5 flex-1 rounded-full transition-colors ${
                          done ? "bg-primary" : "bg-muted hover:bg-primary/30"
                        }`}
                      />
                    );
                  })}
                </div>
                <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {STEP_LABELS.map((label, index) => (
                    <li key={label} className={selected.steps === index + 1 ? "font-semibold text-foreground" : ""}>
                      {index + 1}. {label}
                      {selected.steps === index + 1 ? " — đang ở đây" : ""}
                    </li>
                  ))}
                </ol>
              </div>

              {/* 4 ô up PDF */}
              <div className="mt-5">
                <p className="text-sm font-semibold">File PDF</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {PDF_SLOTS.map((slot) => {
                    const pdf = selected.pdfs[slot.key];
                    const isUploading = uploadingSlot === slot.key;
                    return (
                      <div key={slot.key} className="rounded-lg border border-border p-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {slot.label}
                        </p>
                        {pdf ? (
                          <div className="mt-2 space-y-2">
                            <p className="break-all text-sm font-medium">{pdf.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(pdf.size)} · Up ngày {formatDateTime(pdf.uploadedAt)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={pdf.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Xem PDF
                              </a>
                              <a
                                href={pdf.url}
                                download={pdf.name}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Tải xuống
                              </a>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => fileInputs.current[slot.key]?.click()}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                Thay file khác
                              </button>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => void handleRemovePdf(selected, slot.key)}
                                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Gỡ file
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Chưa có</p>
                            <button
                              type="button"
                              disabled={isUploading}
                              onClick={() => fileInputs.current[slot.key]?.click()}
                              className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            >
                              <FileUp className="h-3.5 w-3.5" />
                              Up file PDF
                            </button>
                          </div>
                        )}
                        {isUploading && (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Đang tải lên… {uploadProgress}%</p>
                          </div>
                        )}
                        <input
                          ref={(el) => {
                            fileInputs.current[slot.key] = el;
                          }}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            void handlePdfFile(selected, slot.key, file);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cây vải */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Cây vải</p>
                  {fabricDrafts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Tổng: {fabricTotals.meters} m · {fabricTotals.rolls} cây
                    </p>
                  )}
                </div>
                {fabricDrafts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Chưa có dòng vải nào cho mẫu này.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div
                      aria-hidden="true"
                      className="hidden grid-cols-[1fr_88px_88px_36px] gap-2 text-xs text-muted-foreground sm:grid"
                    >
                      <span>Tên vải</span>
                      <span>Số mét</span>
                      <span>Số cây</span>
                      <span />
                    </div>
                    {fabricDrafts.map((draft, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_88px_88px_36px] items-center gap-2"
                      >
                        <label className="sr-only" htmlFor={`fabric-name-${index}`}>
                          Tên vải dòng {index + 1}
                        </label>
                        <input
                          id={`fabric-name-${index}`}
                          type="text"
                          value={draft.name}
                          onChange={(event) => updateFabricDraft(index, { name: event.target.value })}
                          placeholder="Cotton 240gsm"
                          className="w-full min-w-0 rounded-lg border border-border px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                        <label className="sr-only" htmlFor={`fabric-meters-${index}`}>
                          Số mét dòng {index + 1}
                        </label>
                        <input
                          id={`fabric-meters-${index}`}
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          value={draft.meters}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateFabricDraft(index, {
                              meters: value !== "" && Number(value) < 0 ? "0" : value,
                            });
                          }}
                          placeholder="Số mét"
                          className="w-full min-w-0 rounded-lg border border-border px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                        <label className="sr-only" htmlFor={`fabric-rolls-${index}`}>
                          Số cây dòng {index + 1}
                        </label>
                        <input
                          id={`fabric-rolls-${index}`}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={draft.rolls}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateFabricDraft(index, {
                              rolls: value !== "" && Number(value) < 0 ? "0" : value,
                            });
                          }}
                          placeholder="Số cây"
                          className="w-full min-w-0 rounded-lg border border-border px-2.5 py-2 text-sm outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFabricRow(index)}
                          aria-label={`Xóa dòng vải ${draft.name.trim() || index + 1}`}
                          title="Xóa dòng vải này"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddFabricRow}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm dòng vải
                  </button>
                  {fabricsDirty && (
                    <>
                      <button
                        type="button"
                        disabled={isSavingFabrics}
                        onClick={() => void handleSaveFabrics()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {isSavingFabrics ? "Đang lưu…" : "Lưu cây vải"}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingFabrics}
                        onClick={handleResetFabrics}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Hủy thay đổi
                      </button>
                      <span className="text-xs text-amber-700">Có thay đổi chưa lưu.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Đổi trạng thái tay */}
              <div className="mt-5">
                <p className="text-sm font-semibold">Trạng thái</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_ORDER.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isSaving || selected.status === status}
                      onClick={() => void handleSetStatus(selected, status)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                        selected.status === status
                          ? "bg-primary text-white"
                          : "border border-border bg-white hover:bg-muted"
                      }`}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Xóa mẫu */}
              <div className="mt-6 border-t border-border pt-4">
                {showDeleteConfirm ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-red-600">
                      Xóa hẳn mẫu {selected.code} {selected.name}?
                    </p>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleDelete()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Xóa hẳn
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa mẫu này
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Popup thêm mẫu mới */}
      {showAddForm &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onClick={() => setShowAddForm(false)}
            role="presentation"
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-label="Thêm mẫu thiết kế mới"
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void handleCreate(event)}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold">Thêm mẫu mới</h2>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Đóng"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium">
                    Tên mẫu <span className="text-red-600">*</span>
                  </span>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    placeholder="VD: Áo wash xám — Carpe Diem, Ad Astra"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Loại sản phẩm</span>
                  <select
                    value={formType}
                    onChange={(event) => setFormType(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Người phụ trách</span>
                  <input
                    type="text"
                    list="design-assignee-suggestions"
                    value={formAssignee}
                    onChange={(event) => setFormAssignee(event.target.value)}
                    placeholder="Gõ tên người phụ trách…"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <datalist id="design-assignee-suggestions">
                    {ASSIGNEE_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Hạn hoàn thành
                  </span>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(event) => setFormDeadline(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <fieldset>
                  <legend className="text-sm font-medium">Đang ở bước</legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {[0, 1, 2, 3, 4, 5].map((step) => (
                      <button
                        key={step}
                        type="button"
                        aria-pressed={formSteps === step}
                        onClick={() => setFormSteps(step)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          formSteps === step
                            ? "bg-primary text-white"
                            : "border border-border bg-white hover:bg-muted"
                        }`}
                      >
                        {step === 0 ? "Chưa bắt đầu" : `Bước ${step}/5`}
                      </button>
                    ))}
                  </div>
                  {formSteps > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Bước {formSteps}: {STEP_LABELS[formSteps - 1]}
                    </p>
                  )}
                </fieldset>

                <label className="block">
                  <span className="text-sm font-medium">Ghi chú cho design</span>
                  <textarea
                    value={formNotes}
                    onChange={(event) => setFormNotes(event.target.value)}
                    rows={3}
                    placeholder="Ghi chú về mẫu, hình in, thông số…"
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isSaving ? "Đang lưu…" : "Thêm mẫu"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}
