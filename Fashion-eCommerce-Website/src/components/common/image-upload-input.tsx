import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link2, Upload } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";

import { useToast } from "@/components/common/toast";
import { compressImageToWebP, uploadBlobDirectToCloudinary } from "@/utils/cloudinary-upload";

type ImageUploadInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Cho phép chọn thêm file video (dùng cho hero banner). Mặc định chỉ nhận ảnh. */
  acceptVideo?: boolean;
  /** Kích thước tối đa (px) khi nén ảnh. Tăng lên cho ảnh banner full-width để tránh mờ. */
  maxDimension?: number;
};

const BASE64_IMAGE_PREFIX = "data:image/";
const BASE64_VIDEO_PREFIX = "data:video/";

export function ImageUploadInput({
  value,
  onChange,
  placeholder = "Nhập URL hình ảnh",
  className = "",
  disabled = false,
  acceptVideo = false,
  maxDimension = 1800,
}: ImageUploadInputProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const isUploading = uploadProgress !== null;
  const previewSrc = value.trim();
  const isDataImage = useMemo(() => value.startsWith(BASE64_IMAGE_PREFIX), [value]);
  const isDataVideo = useMemo(() => value.startsWith(BASE64_VIDEO_PREFIX), [value]);
  const isVideoUrl = useMemo(() => isDataVideo || /\.(mp4|webm|ogg)$/i.test(previewSrc), [isDataVideo, previewSrc]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideoFile = file.type.startsWith("video/");
    const isImageFile = file.type.startsWith("image/");

    if (!isImageFile && !(acceptVideo && isVideoFile)) {
      showToast(
        acceptVideo ? "Vui lòng chọn file ảnh hoặc video hợp lệ." : "Vui lòng chọn file ảnh hợp lệ.",
        "warning"
      );
      event.target.value = "";
      return;
    }

    // Video: không nén qua canvas được, đọc thẳng Base64 rồi gửi lên (backend sẽ upload lên Cloudinary)
    if (isVideoFile) {
      const MAX_VIDEO_MB = 30;
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        showToast(`Video quá lớn (tối đa ${MAX_VIDEO_MB}MB). Vui lòng nén video trước khi upload.`, "warning");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      event.target.value = "";
      return;
    }

    // Ảnh: nén thành WebP qua canvas rồi tải TRỰC TIẾP lên Cloudinary (có thanh
    // tiến trình). Chỉ gửi URL ngắn vào onChange — không còn nhét Base64 1,65MB
    // vào settings nữa. Lỗi thì thử lại đúng ảnh này (bấm Upload lại); nếu tải
    // trực tiếp thất bại thì gửi data URL đã nén như trước để backend PUT đưa
    // lên Cloudinary (đường dự phòng), ảnh không bị mất.
    const uploadOneFile = async () => {
      setUploadProgress(0);
      try {
        const blob = await compressImageToWebP(file, maxDimension);
        const secureUrl = await uploadBlobDirectToCloudinary(blob, {
          onProgress: (percent) => setUploadProgress(percent),
        });
        setUploadProgress(null);
        onChange(secureUrl);
      } catch (error) {
        setUploadProgress(null);
        console.warn("[ImageUploadInput] Tải trực tiếp lên Cloudinary thất bại, dùng đường dự phòng qua backend:", error);
        showToast("Tải trực tiếp lỗi, đang lưu ảnh qua máy chủ. Bấm Upload lại nếu ảnh không hiện.", "warning");
        try {
          const fallbackBlob = await compressImageToWebP(file, maxDimension);
          const reader = new FileReader();
          reader.onload = (e) => onChange(e.target?.result as string);
          reader.readAsDataURL(fallbackBlob);
        } catch {
          showToast("Không tải được ảnh. Vui lòng thử lại.", "warning");
        }
      }
    };

    void uploadOneFile();
    event.target.value = "";
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex shrink-0 items-center gap-2 rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Đang tải..." : "Upload"}
        </button>
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={isDataImage || isDataVideo ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled || isUploading}
            className="w-full rounded border border-border px-4 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={placeholder}
          />
        </div>
      </div>
      {isUploading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Đang tải ảnh lên... {uploadProgress ?? 0}%</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptVideo ? "image/*,video/*" : "image/*"}
        onChange={handleFileUpload}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <p className="text-xs text-muted-foreground">
        {isDataVideo
          ? "Đang dùng video upload từ máy."
          : isDataImage
            ? "Đang dùng ảnh upload từ máy."
            : acceptVideo
              ? "Bạn có thể upload ảnh/video hoặc dán URL trực tiếp."
              : "Bạn có thể upload ảnh hoặc dán URL trực tiếp."}
      </p>
      {previewSrc ? (
        <div className="flex justify-end">
          <div className="overflow-hidden rounded border border-border bg-muted/20 p-1.5">
            {isVideoUrl ? (
              <video src={previewSrc} className="h-14 w-14 rounded object-cover" muted loop autoPlay playsInline />
            ) : (
              <ImageWithFallback src={previewSrc} alt="Image preview" className="h-14 w-14 rounded object-cover" />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
