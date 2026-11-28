// Trang Quản trị — Quản lý mẫu thiết kế.
// Dữ liệu thật từ backend (GET/POST/PUT/DELETE /api/designs, header x-admin-key).
// File PDF up qua backend (POST /api/designs/:id/pdf, body JSON chứa data URL
// base64); backend up lên Cloudinary (folder madmad-designs), kiểm chứng file
// tồn tại rồi mới lưu URL về database và trả lại bản ghi đã cập nhật.
// Xem PDF: render ngay trong trang bằng Mozilla PDF.js nạp động từ CDN
// (pdfjs-dist 3.11.174), dùng đúng pdf.url gốc trên Cloudinary — KHÔNG thêm
// đuôi .pdf (thêm .pdf vào URL raw của Cloudinary có thể trả 401).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FileUp,
  Maximize,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
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

// Tải PDF: KHÔNG còn helper gắn fl_attachment vào URL — chèn fl_attachment
// vào URL raw bị Cloudinary chặn (cùng cơ chế chặn đuôi .pdf trả 401 "deny or
// ACL failure") nên nút Tải xuống không chạy. Cơ chế mới là handler downloadPdf
// trong component: fetch URL gốc → blob → object URL → bấm thẻ <a> tạm.

// Trình xem PDF trong trang — Mozilla PDF.js (pdfjs-dist 3.11.174) nạp động
// từ cdnjs, KHÔNG cài npm. Script chỉ được nạp khi người dùng bấm "Xem PDF"
// lần đầu, và chỉ nạp 1 lần cho cả phiên (promise dùng chung ở cấp module).
// Worker trỏ tới file worker trên cùng CDN, cùng version.
// LƯU Ý: trình xem dùng đúng pdf.url gốc trên Cloudinary (secure_url raw,
// KHÔNG có đuôi .pdf). Thêm .pdf vào cuối URL raw của Cloudinary có thể trả
// 401 (x-cld-error: deny or ACL failure). Cloudinary trả header
// Access-Control-Allow-Origin: * nên PDF.js fetch được từ trình duyệt.
// Google Docs Viewer cũ đã bỏ vì báo "No preview available" với file này.
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Kiểu tối thiểu cho PDF.js nạp từ CDN (chỉ dùng getDocument + render trang).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsLib = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsDocument = any;

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

let pdfjsLoadPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  if (typeof window !== "undefined" && window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfjsLoadPromise) return pdfjsLoadPromise;
  pdfjsLoadPromise = new Promise<PdfJsLib>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN_URL;
    script.async = true;
    script.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) {
        pdfjsLoadPromise = null;
        reject(new Error("Không tải được thư viện xem PDF (PDF.js)."));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      resolve(lib);
    };
    script.onerror = () => {
      pdfjsLoadPromise = null;
      reject(new Error("Không tải được thư viện xem PDF (PDF.js). Kiểm tra lại mạng rồi thử lại."));
    };
    document.head.appendChild(script);
  });
  return pdfjsLoadPromise;
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

// Backend luôn trả 1 object cho mỗi slot PDF, kể cả ô trống
// ({url: null, name: null, size: null, uploadedAt: null}). Ép ô không có URL
// thật thành null để nút Xem/Tải chỉ hiện khi có file, và để đếm PDF
// (countPdfs) không tính ô trống. Nếu không, 1 ô trống cũng render nút
// Xem/Tải với URL null.
function normalizePdf(raw: unknown): DesignPdf | null {
  if (!raw || typeof raw !== "object") return null;
  const pdf = raw as Record<string, unknown>;
  const url = typeof pdf.url === "string" && pdf.url.trim() ? pdf.url.trim() : null;
  if (!url) return null;
  return {
    url,
    name: typeof pdf.name === "string" ? pdf.name : "",
    size: typeof pdf.size === "number" ? pdf.size : 0,
    uploadedAt: typeof pdf.uploadedAt === "string" ? pdf.uploadedAt : "",
  };
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
      front: normalizePdf(pdfs.front),
      back: normalizePdf(pdfs.back),
      print: normalizePdf(pdfs.print),
      full: normalizePdf(pdfs.full),
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

// Up PDF qua backend: đọc file thành data URL base64 rồi POST JSON tới
// POST /api/designs/:id/pdf. Backend up lên Cloudinary, kiểm chứng file tồn
// tại rồi mới lưu và trả lại bản ghi đã cập nhật (envelope { success, data }).
// Dùng XHR để báo tiến trình up như luồng cũ.
function uploadPdfViaBackend(
  designId: string,
  slot: DesignPdfSlot,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Design> {
  return (async () => {
    const fileDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Không đọc được file PDF."));
      reader.readAsDataURL(file);
    });

    // file.type trên iPhone (nhất là file iCloud) có thể rỗng hoặc sai nên
    // MIME trong data URL không đáng tin — ép lại tiền tố PDF, giữ nguyên
    // phần base64. File đã được xác nhận là PDF ở handlePdfFile.
    const normalizedFileDataUrl = `data:application/pdf;base64,${fileDataUrl.slice(fileDataUrl.indexOf(",") + 1)}`;

    return new Promise<Design>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_URL}/designs/${designId}/pdf`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("x-admin-key", getAdminKey());
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText) as {
            success?: boolean;
            message?: string;
            data?: Record<string, unknown>;
          };
          if (xhr.status >= 200 && xhr.status < 300 && res.success && res.data) {
            resolve(normalizeDesign(res.data));
          } else {
            reject(new Error(res.message || "Tải file PDF thất bại."));
          }
        } catch {
          reject(new Error("Tải file PDF thất bại."));
        }
      };
      xhr.onerror = () => reject(new Error("Mất kết nối khi tải file PDF lên."));
      xhr.send(JSON.stringify({ slot, fileName: file.name, fileDataUrl: normalizedFileDataUrl }));
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

  // Modal xem PDF trong trang (PDF.js). viewerPdf giữ URL GỐC trên
  // Cloudinary (không thêm .pdf) + tên file + nhãn ô PDF để hiển thị.
  const [viewerPdf, setViewerPdf] = useState<{ url: string; name: string; slotLabel: string } | null>(null);
  const [viewerDoc, setViewerDoc] = useState<PdfJsDocument | null>(null);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerTotal, setViewerTotal] = useState(0);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState("");
  const viewerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRenderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const viewerLoadSeqRef = useRef(0);

  // Zoom trình xem PDF: hệ số nhân trên tỉ lệ vừa khung đang chọn.
  // 1 = vừa đúng khung (vừa rộng hoặc vừa trang tùy chế độ), bước 0.25,
  // nút +/− kẹp 0.5–4. Đổi trang giữ nguyên zoom; mở file mới reset về 1
  // và chế độ vừa rộng.
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerFitMode, setViewerFitMode] = useState<"width" | "page">("width");
  // Kích thước trang gốc (scale 1) + khung chứa, để tính % zoom hiển thị
  // (khi vừa trang, % hiển thị so với vừa rộng) và render lại khi xoay màn hình.
  const [viewerPageSize, setViewerPageSize] = useState<{ width: number; height: number } | null>(null);
  const [viewerViewportSize, setViewerViewportSize] = useState<{ width: number; height: number } | null>(null);

  const openPdfViewer = useCallback((pdf: DesignPdf, slotLabel: string) => {
    setViewerPdf({ url: pdf.url, name: pdf.name || "file.pdf", slotLabel });
    setViewerDoc(null);
    setViewerPage(1);
    setViewerTotal(0);
    setViewerError("");
    setViewerLoading(true);
    setViewerZoom(1);
    setViewerFitMode("width");
    setViewerPageSize(null);
    setViewerViewportSize(null);
  }, []);

  const closePdfViewer = useCallback(() => {
    viewerLoadSeqRef.current += 1;
    viewerRenderTaskRef.current?.cancel();
    viewerRenderTaskRef.current = null;
    setViewerPdf(null);
    setViewerDoc(null);
    setViewerPage(1);
    setViewerTotal(0);
    setViewerError("");
    setViewerLoading(false);
    setViewerZoom(1);
    setViewerFitMode("width");
    setViewerPageSize(null);
    setViewerViewportSize(null);
  }, []);

  // Tải PDF về máy qua JavaScript (fetch → blob → object URL), dùng đúng
  // URL gốc trên Cloudinary mà PDF.js đang tải thành công. Cách cũ chèn
  // fl_attachment vào URL bị Cloudinary chặn (cùng cơ chế chặn đuôi .pdf
  // trả 401 "deny or ACL failure") nên nút Tải xuống không chạy. Object
  // URL cùng nguồn nên thuộc tính download được trình duyệt tôn trọng và
  // giữ đúng tên file. Fetch lỗi thì báo lỗi rõ + mở URL gốc trong tab mới
  // để vẫn xem/lưu được file. Không bấm 2 lần cùng lúc.
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const downloadPdf = useCallback(
    async (pdf: { url: string; name: string }) => {
      if (!pdf?.url || downloadingPdf) return;
      setDownloadingPdf(true);
      try {
        const res = await fetch(pdf.url);
        if (!res.ok) throw new Error(`Không tải được file (mã ${res.status}).`);
        const blob = await res.blob();
        if (!blob || blob.size === 0) throw new Error("File tải về rỗng.");
        const objectUrl = URL.createObjectURL(blob);
        const fileName = pdf.name?.endsWith(".pdf") ? pdf.name : `${pdf.name || "file"}.pdf`;
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Tải file PDF thất bại.", "error");
        window.open(pdf.url, "_blank", "noopener,noreferrer");
      } finally {
        setDownloadingPdf(false);
      }
    },
    [downloadingPdf, showToast],
  );

  // Sửa thông tin mẫu ngay trong popup chi tiết (tên, loại, phụ trách, hạn,
  // ghi chú). Mã mẫu (MM-NNN) không cho sửa. Lưu qua updateDesign có sẵn
  // (PUT /api/designs/:id) nên thẻ mẫu + popup cập nhật ngay sau khi lưu.
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const startEditingInfo = useCallback(() => {
    if (!selected) return;
    setEditName(selected.name || "");
    setEditType(selected.type || PRODUCT_TYPES[0]);
    setEditAssignee(selected.assignee || "");
    setEditDeadline(toDateInputValue(selected.deadline));
    setEditNotes(selected.notes || "");
    setIsEditingInfo(true);
  }, [selected]);

  const cancelEditingInfo = useCallback(() => {
    setIsEditingInfo(false);
  }, []);

  const handleSaveInfo = useCallback(async () => {
    if (!selected || isSavingInfo) return;
    if (!editName.trim()) {
      showToast("Tên mẫu không được để trống.", "error");
      return;
    }
    setIsSavingInfo(true);
    try {
      await updateDesign(selected, {
        name: editName.trim(),
        type: editType,
        assignee: editAssignee.trim(),
        deadline: editDeadline ? new Date(`${editDeadline}T00:00:00`).toISOString() : null,
        notes: editNotes.trim(),
      });
      setIsEditingInfo(false);
      showToast("Đã lưu thông tin mẫu.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Lưu thông tin thất bại.", "error");
    } finally {
      setIsSavingInfo(false);
    }
  }, [selected, isSavingInfo, editName, editType, editAssignee, editDeadline, editNotes, updateDesign, showToast]);

  // Đổi sang mẫu khác thì thoát chế độ sửa (bản nháp thuộc về mẫu cũ).
  // Chỉ theo dõi id, không theo dõi cả object selected (object đổi mỗi lần
  // lưu PDF/vải thì không được thoát chế độ sửa giữa chừng).
  useEffect(() => {
    setIsEditingInfo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Zoom +/− giữ nguyên chế độ vừa khung đang chọn, chỉ nhân hệ số.
  const viewerZoomIn = useCallback(() => {
    setViewerZoom((zoom) => Math.min(4, Math.round((zoom + 0.25) * 100) / 100));
  }, []);
  const viewerZoomOut = useCallback(() => {
    setViewerZoom((zoom) => Math.max(0.5, Math.round((zoom - 0.25) * 100) / 100));
  }, []);
  const viewerFitWidth = useCallback(() => {
    setViewerFitMode("width");
    setViewerZoom(1);
  }, []);
  const viewerFitPage = useCallback(() => {
    setViewerFitMode("page");
    setViewerZoom(1);
  }, []);

  // % zoom hiển thị: so với vừa chiều rộng. Ở chế độ vừa trang, tỉ lệ vừa
  // trang so với vừa rộng là min(1, (cao khung/cao trang)/(rộng khung/rộng trang)).
  const viewerZoomPercent = useMemo(() => {
    if (viewerFitMode !== "page" || !viewerPageSize || !viewerViewportSize) {
      return Math.round(viewerZoom * 100);
    }
    const ratio = Math.min(
      1,
      viewerViewportSize.height / viewerPageSize.height / (viewerViewportSize.width / viewerPageSize.width),
    );
    return Math.round(viewerZoom * ratio * 100);
  }, [viewerZoom, viewerFitMode, viewerPageSize, viewerViewportSize]);

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
      const res = await apiRequest<unknown>(`/designs${query ? `?${query}` : ""}`);
      // apiRequest trả về toàn bộ JSON đã parse, không bóc envelope.
      // Backend trả { success: true, data: [...], total } — bóc res.data
      // trước, giữ res.designs / mảng trần làm phương án dự phòng.
      const envelope = res as { data?: unknown; designs?: unknown[] };
      const list = Array.isArray(res)
        ? res
        : Array.isArray(envelope.data)
          ? envelope.data
          : (envelope.designs ?? []);
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

  // Load lại khi quay lại tab / cửa sổ: dữ liệu có thể đã đổi từ máy khác.
  useEffect(() => {
    const handleFocus = () => {
      void loadDesigns();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) void loadDesigns();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDesigns]);

  // Đóng popup bằng phím Esc. Modal xem PDF (nếu đang mở) được đóng trước,
  // popup chi tiết bên dưới vẫn còn nguyên.
  useEffect(() => {
    if (!selected && !showAddForm && !viewerPdf) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (viewerPdf) {
          closePdfViewer();
          return;
        }
        setSelected(null);
        setShowAddForm(false);
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, showAddForm, viewerPdf, closePdfViewer]);

  // Nạp PDF.js (lần đầu bấm Xem) rồi mở tài liệu từ URL GỐC trên Cloudinary.
  // getDocument fetch trực tiếp pdf.url — Cloudinary cho phép CORS (*).
  useEffect(() => {
    if (!viewerPdf) return;
    const seq = ++viewerLoadSeqRef.current;
    setViewerLoading(true);
    setViewerError("");
    loadPdfJs()
      .then((lib) => lib.getDocument({ url: viewerPdf.url }).promise)
      .then((doc: PdfJsDocument) => {
        if (viewerLoadSeqRef.current !== seq) return;
        setViewerDoc(doc);
        setViewerTotal(doc.numPages);
        setViewerPage(1);
        setViewerLoading(false);
      })
      .catch((error: unknown) => {
        if (viewerLoadSeqRef.current !== seq) return;
        setViewerLoading(false);
        setViewerError(
          error instanceof Error
            ? `Không mở được file PDF: ${error.message}`
            : "Không mở được file PDF. Thử bấm Tải xuống để kiểm tra file.",
        );
      });
    return () => {
      // Đổi file / đóng modal giữa chừng thì kết quả cũ bị bỏ (so seq).
    };
  }, [viewerPdf]);

  // Render trang hiện tại ra canvas. Tỉ lệ gốc theo chế độ vừa khung:
  // "width" = vừa chiều rộng, "page" = vừa cả trang trong khung nhìn
  // (min(vừa rộng, vừa cao)); nhân thêm hệ số zoom hiện tại.
  // Vẽ ở độ phân giải cao hơn (devicePixelRatio, tối đa 2x) để chữ không mờ.
  useEffect(() => {
    if (!viewerDoc || !viewerPdf) return;
    const canvas = viewerCanvasRef.current;
    const container = viewerContainerRef.current;
    if (!canvas || !container) return;
    let cancelled = false;
    viewerRenderTaskRef.current?.cancel();
    viewerRenderTaskRef.current = null;
    viewerDoc
      .getPage(viewerPage)
      .then((page: PdfJsDocument) => {
        if (cancelled) return;
        const containerWidth = container.clientWidth || 600;
        const containerHeight = container.clientHeight || 800;
        const baseViewport = page.getViewport({ scale: 1 });
        setViewerPageSize((prev) =>
          prev && prev.width === baseViewport.width && prev.height === baseViewport.height
            ? prev
            : { width: baseViewport.width, height: baseViewport.height },
        );
        const fitWidthScale = containerWidth / baseViewport.width;
        const fitHeightScale = containerHeight / baseViewport.height;
        const fitScale = viewerFitMode === "page" ? Math.min(fitWidthScale, fitHeightScale) : fitWidthScale;
        const scale = fitScale * viewerZoom;
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const context = canvas.getContext("2d");
        if (!context) return;
        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        viewerRenderTaskRef.current = renderTask;
        return renderTask.promise;
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Lỗi render (thường là trang lỗi) — chỉ báo khi chưa có lỗi mở file.
        setViewerError((prev) =>
          prev ||
          (error instanceof Error
            ? `Không vẽ được trang ${viewerPage}: ${error.message}`
            : `Không vẽ được trang ${viewerPage}.`),
        );
      });
    return () => {
      cancelled = true;
      viewerRenderTaskRef.current?.cancel();
      viewerRenderTaskRef.current = null;
    };
  }, [viewerDoc, viewerPage, viewerPdf, viewerZoom, viewerFitMode, viewerViewportSize]);

  // Đo lại khung chứa khi mở modal và khi cửa sổ đổi kích thước (xoay màn
  // hình / đổi cửa sổ): debounce ~150ms rồi render lại với khung mới.
  // Ở chế độ vừa trang, tỉ lệ vừa khung được tính lại từ kích thước mới
  // nên trang vẫn vừa khung mà không cần đổi hệ số zoom.
  useEffect(() => {
    if (!viewerPdf) return;
    const measure = () => {
      const container = viewerContainerRef.current;
      if (!container) return;
      setViewerViewportSize((prev) => {
        const next = { width: container.clientWidth, height: container.clientHeight };
        return prev && prev.width === next.width && prev.height === next.height ? prev : next;
      });
    };
    measure();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(measure, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [viewerPdf]);

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
      const res = await apiRequest<Record<string, unknown>>(`/designs/${design.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // Backend trả envelope { success, data: {...} } — dùng bản ghi máy
      // chủ trả về khi có id hợp lệ, chỉ fallback về giá trị local lạc
      // quan khi máy chủ không trả bản ghi.
      const raw = res as Record<string, unknown>;
      const record = (raw?.data ?? (raw?.id ? raw : undefined)) as Record<string, unknown> | undefined;
      const updated =
        record && record.id
          ? normalizeDesign(record)
          : normalizeDesign({ ...design, ...patch } as Record<string, unknown>);
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
      // File 0 byte (thường là file iCloud trên iPhone chưa tải về hết):
      // chặn ngay, không up, không lưu mục file.
      if (file.size === 0) {
        showToast("File rỗng, vui lòng mở file trong app Tệp để tải về đầy đủ rồi chọn lại.", "error");
        return;
      }
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        showToast("Chỉ chấp nhận file PDF. Vui lòng chọn file .pdf.", "error");
        return;
      }
      setUploadingSlot(slot);
      setUploadProgress(0);
      try {
        // Backend đã lưu file + tính status rồi, chỉ áp dụng bản ghi trả về.
        const updated = await uploadPdfViaBackend(design.id, slot, file, setUploadProgress);
        applyDesignUpdate(updated);
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
    [applyDesignUpdate, showToast],
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
    const deletedId = selected.id;
    setIsSaving(true);
    try {
      // apiRequest chỉ resolve khi response 2xx (không throw) — mọi 2xx
      // đều coi là xóa thành công; lỗi thật từ máy chủ sẽ throw kèm đúng
      // message của nó và rơi xuống catch bên dưới.
      await apiRequest(`/designs/${deletedId}`, { method: "DELETE" });
      // Load lại từ máy chủ rồi mới báo thành công + đóng popup, để danh
      // sách không còn mẫu vừa xóa dù state local có lệch.
      await loadDesigns();
      showToast("Đã xóa mẫu thiết kế.");
      setSelected(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Xóa mẫu thất bại.", "error");
    } finally {
      setIsSaving(false);
    }
  }, [selected, loadDesigns, showToast]);

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
        const res = await apiRequest<Record<string, unknown>>("/designs", {
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
        // Backend trả envelope { success, data: {...} } — bóc res.data
        // trước khi normalize (normalize cả envelope sẽ ra id/code/name
        // rỗng). Không có bản ghi trả về thì dùng giá trị form.
        const raw = res as Record<string, unknown>;
        const record = (raw?.data ?? (raw?.id ? raw : undefined)) as Record<string, unknown> | undefined;
        const created =
          record && record.id
            ? normalizeDesign(record)
            : normalizeDesign({
                name: formName.trim(),
                type: formType,
                assignee: formAssignee.trim(),
                deadline: formDeadline ? new Date(`${formDeadline}T00:00:00`).toISOString() : null,
                steps: formSteps,
                notes: formNotes.trim(),
                status: "CHUA_LAM",
              } as Record<string, unknown>);
        setDesigns((prev) => [created, ...prev]);
        // Load lại từ máy chủ để danh sách khớp đúng bản ghi đã lưu
        // (code MM-NNN do server sinh, id thật để xóa/sửa sau đó).
        await loadDesigns();
        showToast(`Đã thêm mẫu mới${created.code ? ` ${created.code}` : ""}.`);
        resetAddForm();
        setShowAddForm(false);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Thêm mẫu thất bại.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [formName, formType, formAssignee, formDeadline, formSteps, formNotes, loadDesigns, showToast],
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
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => void loadDesigns()}
            disabled={isLoading}
            aria-label="Làm mới danh sách mẫu thiết kế"
            title="Làm mới danh sách"
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
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
                <div className="min-w-0 flex-1">
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
                  {isEditingInfo ? (
                    <label className="mt-2 block">
                      <span className="text-sm font-medium">
                        Tên mẫu <span className="text-red-600">*</span>
                      </span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder="Tên mẫu"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  ) : (
                    <h2 className="mt-2 text-xl font-bold leading-snug">{selected.name}</h2>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isEditingInfo ? (
                    <>
                      <button
                        type="button"
                        disabled={isSavingInfo}
                        onClick={() => void handleSaveInfo()}
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {isSavingInfo ? "Đang lưu…" : "Lưu"}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingInfo}
                        onClick={cancelEditingInfo}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startEditingInfo}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                      Sửa thông tin
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    aria-label="Đóng"
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Loại</dt>
                  {isEditingInfo ? (
                    <dd className="mt-0.5">
                      <select
                        value={editType}
                        onChange={(event) => setEditType(event.target.value)}
                        aria-label="Loại sản phẩm"
                        className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm font-medium outline-none focus:border-primary"
                      >
                        {(PRODUCT_TYPES.includes(editType) ? PRODUCT_TYPES : [editType, ...PRODUCT_TYPES]).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </dd>
                  ) : (
                    <dd className="mt-0.5 font-medium">{selected.type || "—"}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phụ trách</dt>
                  {isEditingInfo ? (
                    <dd className="mt-0.5">
                      <input
                        type="text"
                        list="design-assignee-suggestions-edit"
                        value={editAssignee}
                        onChange={(event) => setEditAssignee(event.target.value)}
                        placeholder="Gõ tên người phụ trách…"
                        aria-label="Người phụ trách"
                        className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm font-medium outline-none focus:border-primary"
                      />
                      <datalist id="design-assignee-suggestions-edit">
                        {ASSIGNEE_SUGGESTIONS.map((suggestion) => (
                          <option key={suggestion} value={suggestion} />
                        ))}
                      </datalist>
                    </dd>
                  ) : (
                    <dd className="mt-0.5 font-medium">{selected.assignee || "—"}</dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Hạn hoàn thành</dt>
                  {isEditingInfo ? (
                    <dd className="mt-0.5">
                      <input
                        type="date"
                        value={editDeadline}
                        onChange={(event) => setEditDeadline(event.target.value)}
                        aria-label="Hạn hoàn thành"
                        className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm font-medium outline-none focus:border-primary"
                      />
                    </dd>
                  ) : (
                    <dd className={`mt-0.5 font-medium ${isOverdue(selected) ? "text-red-600" : ""}`}>
                      {formatDate(selected.deadline)}
                    </dd>
                  )}
                </div>
              </dl>

              {isEditingInfo ? (
                <div className="mt-4">
                  <label className="block">
                    <span className="text-sm font-semibold">Ghi chú</span>
                    <textarea
                      value={editNotes}
                      onChange={(event) => setEditNotes(event.target.value)}
                      rows={3}
                      placeholder="Ghi chú về mẫu, hình in, thông số…"
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              ) : (
                selected.notes && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold">Ghi chú</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes}</p>
                  </div>
                )
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
                        {pdf && pdf.url ? (
                          <div className="mt-2 space-y-2">
                            <p className="break-all text-sm font-medium">{pdf.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(pdf.size)} · Up ngày {formatDateTime(pdf.uploadedAt)}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openPdfViewer(pdf, slot.label)}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Xem PDF
                              </button>
                              <button
                                type="button"
                                disabled={downloadingPdf}
                                onClick={() => void downloadPdf(pdf)}
                                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                                {downloadingPdf ? "Đang tải…" : "Tải xuống"}
                              </button>
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

      {/* Modal xem PDF trong trang (PDF.js) — FULL MÀN HÌNH, nằm trên popup
          chi tiết mẫu. Dùng đúng URL gốc trên Cloudinary (không thêm .pdf).
          Nút Tải xuống tải qua fetch → blob → object URL (dùng đúng URL gốc;
          fl_attachment cũ bị Cloudinary chặn nên đã bỏ). Đóng bằng nút
          X hoặc Esc (bấm nền mờ không còn ý nghĩa khi panel chiếm toàn bộ
          màn hình, nhưng handler nền vẫn giữ lại cho an toàn).
          Pinch-to-zoom KHÔNG làm: vùng canvas dùng cuộn cảm ứng gốc
          (overflow-auto); bắt pinch bằng pointer events cần touch-action:
          none, sẽ phá cuộn/pan cảm ứng — nên chỉ zoom bằng nút +/−. */}
      {viewerPdf &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex bg-black/60 p-0"
            onClick={closePdfViewer}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Xem PDF ${viewerPdf.name}`}
              className="flex h-full max-h-none w-full max-w-none flex-col overflow-hidden rounded-none bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{viewerPdf.slotLabel}</p>
                  <h2 className="mt-0.5 break-all text-base font-bold leading-snug">{viewerPdf.name}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={downloadingPdf}
                    onClick={() => void downloadPdf(viewerPdf)}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingPdf ? "Đang tải…" : "Tải xuống"}
                  </button>
                  <button
                    type="button"
                    onClick={closePdfViewer}
                    aria-label="Đóng trình xem PDF"
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Thanh công cụ zoom — hàng riêng dưới header, cho phép xuống
                  dòng trên màn hình hẹp để không che tên file. */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={viewerZoomOut}
                    disabled={viewerZoom <= 0.5}
                    aria-label="Thu nhỏ"
                    className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span
                    className="min-w-14 text-center text-sm font-medium tabular-nums"
                    aria-live="polite"
                  >
                    {viewerZoomPercent}%
                  </span>
                  <button
                    type="button"
                    onClick={viewerZoomIn}
                    disabled={viewerZoom >= 4}
                    aria-label="Phóng to"
                    className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={viewerFitWidth}
                  aria-pressed={viewerFitMode === "width"}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    viewerFitMode === "width"
                      ? "bg-primary text-white"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  Vừa rộng
                </button>
                <button
                  type="button"
                  onClick={viewerFitPage}
                  aria-pressed={viewerFitMode === "page"}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    viewerFitMode === "page"
                      ? "bg-primary text-white"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  <Maximize className="h-4 w-4" />
                  Vừa trang
                </button>
              </div>

              <div
                ref={viewerContainerRef}
                className="flex-1 overflow-auto bg-muted/50 p-3 sm:p-4"
              >
                {viewerLoading && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Đang tải file PDF…
                  </p>
                )}
                {viewerError && !viewerLoading && (
                  <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                    <p className="text-sm font-medium text-red-700">{viewerError}</p>
                    <button
                      type="button"
                      onClick={() =>
                        openPdfViewer(
                          { url: viewerPdf.url, name: viewerPdf.name, size: 0, uploadedAt: "" },
                          viewerPdf.slotLabel,
                        )
                      }
                      className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
                <canvas ref={viewerCanvasRef} className="mx-auto block bg-white shadow-sm" />
              </div>

              {viewerTotal > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                  <button
                    type="button"
                    disabled={viewerPage <= 1 || viewerLoading}
                    onClick={() => setViewerPage((page) => Math.max(1, page - 1))}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Trang {viewerPage} / {viewerTotal}
                  </p>
                  <button
                    type="button"
                    disabled={viewerPage >= viewerTotal || viewerLoading}
                    onClick={() => setViewerPage((page) => Math.min(viewerTotal, page + 1))}
                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
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
