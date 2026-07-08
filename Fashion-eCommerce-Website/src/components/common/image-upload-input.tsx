import { useMemo, useRef, type ChangeEvent } from "react";
import { Link2, Upload } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";

import { useToast } from "@/components/common/toast";

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
  maxDimension = 1200,
}: ImageUploadInputProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Cấu hình nén ảnh
        const MAX_WIDTH = maxDimension;
        const MAX_HEIGHT = maxDimension;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          onChange(e.target?.result as string); // Fallback to uncompressed
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Nén thành WebP (hoặc JPEG) với chất lượng 80% để giảm thiểu dung lượng tối đa
        const compressedDataUrl = canvas.toDataURL("image/webp", 0.8);
        onChange(compressedDataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="inline-flex shrink-0 items-center gap-2 rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={isDataImage || isDataVideo ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="w-full rounded border border-border px-4 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={placeholder}
          />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptVideo ? "image/*,video/*" : "image/*"}
        onChange={handleFileUpload}
        className="hidden"
        disabled={disabled}
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
