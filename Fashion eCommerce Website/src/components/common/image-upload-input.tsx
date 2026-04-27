import { useMemo, useRef, type ChangeEvent } from "react";
import { Link2, Upload } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";

type ImageUploadInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const BASE64_PREFIX = "data:image/";

export function ImageUploadInput({
  value,
  onChange,
  placeholder = "Nhập URL hình ảnh",
  className = "",
  disabled = false,
}: ImageUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewSrc = value.trim();
  const isDataImage = useMemo(() => value.startsWith(BASE64_PREFIX), [value]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Vui lòng chọn file ảnh hợp lệ.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const nextValue = typeof reader.result === "string" ? reader.result : "";
      onChange(nextValue);
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
            value={isDataImage ? "" : value}
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
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        {isDataImage ? "Đang dùng ảnh upload từ máy." : "Bạn có thể upload ảnh hoặc dán URL trực tiếp."}
      </p>
      {previewSrc ? (
        <div className="flex justify-end">
          <div className="overflow-hidden rounded border border-border bg-muted/20 p-1.5">
            <ImageWithFallback src={previewSrc} alt="Image preview" className="h-14 w-14 rounded object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
