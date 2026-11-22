// Tải ảnh TRỰC TIẾP lên Cloudinary từ trình duyệt (signed upload).
// Luồng: xin chữ ký ở backend (POST /api/settings/upload-signature, x-admin-key)
// -> tải file bằng XMLHttpRequest lên api.cloudinary.com (có tiến trình upload)
// -> nhận secure_url. api_secret KHÔNG bao giờ rời máy chủ, chỉ có chữ ký + api_key
// (không phải secret) đi qua frontend.
import { API_URL, getAdminKey } from "@/config/api";

export type UploadSignature = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  upload_url: string;
};

export async function getUploadSignature(folder = "madmad-products"): Promise<UploadSignature> {
  const res = await fetch(`${API_URL}/settings/upload-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": getAdminKey(),
    },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) {
    throw new Error(`Không xin được chữ ký upload (HTTP ${res.status}).`);
  }
  return (await res.json()) as UploadSignature;
}

// Nén ảnh thành WebP bằng canvas (giữ đúng cấu hình nén cũ: tối đa maxDimension px, WebP 92%).
export function compressImageToWebP(file: File, maxDimension = 1800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("File ảnh không hợp lệ."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Trình duyệt không hỗ trợ nén ảnh."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Nén ảnh thất bại."))),
          "image/webp",
          0.92,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Tải 1 blob ảnh trực tiếp lên Cloudinary bằng XHR để báo tiến trình (0–100).
// Trả về secure_url. Lỗi thì throw — bên gọi tự quyết định thử lại / dùng đường dự phòng.
export function uploadBlobDirectToCloudinary(
  blob: Blob,
  options?: { folder?: string; onProgress?: (percent: number) => void },
): Promise<string> {
  return getUploadSignature(options?.folder ?? "madmad-products").then(
    (sig) =>
      new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append("file", blob);
        form.append("api_key", sig.api_key);
        form.append("timestamp", String(sig.timestamp));
        form.append("signature", sig.signature);
        form.append("folder", sig.folder);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", sig.upload_url);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && options?.onProgress) {
            options.onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message?: string } };
            if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) {
              resolve(data.secure_url);
            } else {
              reject(new Error(data.error?.message || `Tải lên Cloudinary thất bại (HTTP ${xhr.status}).`));
            }
          } catch {
            reject(new Error(`Tải lên Cloudinary thất bại (HTTP ${xhr.status}).`));
          }
        };
        xhr.onerror = () => reject(new Error("Mất kết nối khi tải ảnh lên Cloudinary."));
        xhr.send(form);
      }),
  );
}
