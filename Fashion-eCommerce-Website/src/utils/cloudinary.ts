// Tối ưu ảnh Cloudinary cho web: chỉ biến đổi URL Cloudinary, các nguồn khác giữ nguyên.
// w_800 đủ cho thẻ sản phẩm, w_1200 cho trang chi tiết; f_auto/q_auto để Cloudinary
// tự chọn định dạng và mức nén phù hợp từng trình duyệt.
export function optimizeImageUrl(src: string | undefined, width = 800): string {
  if (!src) return "";
  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (src.indexOf("res.cloudinary.com") === -1 || idx === -1) return src;
  const after = src.slice(idx + marker.length);
  if (/^f_auto/.test(after) || /^w_\d+/.test(after)) return src;
  return `${src.slice(0, idx + marker.length)}f_auto,q_auto,w_${width}/${after}`;
}
