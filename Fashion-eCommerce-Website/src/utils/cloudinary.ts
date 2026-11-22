// Tối ưu ảnh Cloudinary cho web: chỉ biến đổi URL Cloudinary, các nguồn khác giữ nguyên.
// f_auto/q_auto để Cloudinary tự chọn định dạng và mức nén phù hợp từng trình duyệt.
// w_800 đủ cho thẻ sản phẩm, w_1200 cho trang chi tiết, w_1600–2400 cho banner full-width.
// Nếu URL đã có biến đổi f_auto/q_auto/w_... thì thay đúng w_... bằng cỡ yêu cầu,
// để srcSet luôn ra đúng cỡ thay vì giữ nguyên cỡ cũ.
function withWidth(src: string, width: number): string {
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (src.indexOf("res.cloudinary.com") === -1 || idx === -1) return src;
  const after = src.slice(idx + marker.length);
  const rest = after
    .replace(/^f_auto,q_auto,w_\d+\//, "")
    .replace(/^f_auto,q_auto\//, "")
    .replace(/^f_auto\//, "")
    .replace(/^w_\d+\//, "");
  return `${src.slice(0, idx + marker.length)}f_auto,q_auto,w_${width}/${rest}`;
}

export function isCloudinaryUrl(src: string | undefined): boolean {
  if (!src) return false;
  return src.indexOf("res.cloudinary.com") !== -1 && src.indexOf("/image/upload/") !== -1;
}

export function optimizeImageUrl(src: string | undefined, width = 800): string {
  if (!src) return "";
  return withWidth(src, width);
}

// srcSet cho ảnh Cloudinary: trình duyệt tự chọn cỡ theo màn hình.
// Trả undefined cho ảnh không phải Cloudinary (giữ nguyên, không srcSet sai).
export function cloudinarySrcSet(
  src: string | undefined,
  widths: number[] = [480, 800, 1200, 1600],
): string | undefined {
  if (!src || !isCloudinaryUrl(src)) return undefined;
  return widths.map((w) => `${withWidth(src, w)} ${w}w`).join(", ");
}
