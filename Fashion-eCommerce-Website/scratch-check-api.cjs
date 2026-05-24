async function check() {
  const url = 'https://madmad-backend.vercel.app/api/products';
  console.log("🔍 Kiểm tra tốc độ API sau khi tối ưu Cloudinary...\n");
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url);
      const data = await res.json();
      const ms = Date.now() - t0;
      const grade = ms < 600 ? "🟢 NHANH" : ms < 2000 ? "🟡 BÌNH THƯỜNG" : "🔴 CHẬM";
      console.log(`Request #${i}: ${ms}ms ${grade} | HTTP ${res.status} | ${data.length} sản phẩm`);
      if (i === 1) {
        // Kiểm tra payload size
        const size = JSON.stringify(data).length;
        console.log(`         Dung lượng phản hồi: ${(size/1024).toFixed(1)} KB (trước: ~2750 KB)\n`);
      }
    } catch (e) {
      console.error(`Request #${i} lỗi:`, e.message);
    }
  }
}
check();
