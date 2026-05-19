const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function printStatus(name, success, info = "") {
  const emoji = success ? "🟢 [OK]" : "🔴 [LỖI]";
  console.log(`${emoji.padEnd(9)} ${name.padEnd(38)} ${info}`);
}

async function main() {
  console.log("======================================================================");
  console.log("        📢   MADMAD STUDIO - HỆ THỐNG CHẨN ĐOÁN TOÀN DIỆN");
  console.log("======================================================================\n");

  let overallSuccess = true;

  // 1. Kiểm tra Frontend
  console.log("👉 1. KIỂM TRA CẤU TRÚC FRONTEND:");
  try {
    const fePkg = fs.existsSync(path.join(__dirname, 'package.json'));
    const feModules = fs.existsSync(path.join(__dirname, 'node_modules'));
    const feVite = fs.existsSync(path.join(__dirname, 'vite.config.ts'));
    
    printStatus("File package.json", fePkg);
    printStatus("Thư mục node_modules", feModules, feModules ? "" : "-> Chạy 'npm install'");
    printStatus("Cấu hình vite.config.ts", feVite);
    
    if (!fePkg || !feModules || !feVite) overallSuccess = false;
  } catch (e) {
    printStatus("Lỗi kiểm tra Frontend", false, e.message);
    overallSuccess = false;
  }

  // 2. Kiểm tra Backend & Database Structure
  console.log("\n👉 2. KIỂM TRA CẤU TRÚC BACKEND & DATABASE:");
  try {
    const bePkg = fs.existsSync(path.join(__dirname, 'backend', 'package.json'));
    const beEnv = fs.existsSync(path.join(__dirname, 'backend', '.env'));
    const beSchema = fs.existsSync(path.join(__dirname, 'backend', 'prisma', 'schema.prisma'));
    
    printStatus("File backend/package.json", bePkg);
    printStatus("File cấu hình backend/.env", beEnv, beEnv ? "" : "-> Thiếu file cấu hình database!");
    printStatus("Lược đồ backend/prisma/schema.prisma", beSchema);
    
    if (!bePkg || !beEnv || !beSchema) overallSuccess = false;
  } catch (e) {
    printStatus("Lỗi kiểm tra Backend", false, e.message);
    overallSuccess = false;
  }

  // 3. Kiểm tra kết nối Database qua Neon Postgres
  console.log("\n👉 3. KIỂM TRA KẾT NỐI DATABASE (NEON POSTGRES):");
  try {
    process.stdout.write("⚡ Đang kết nối thử đến cơ sở dữ liệu Postgres... ");
    
    // Load config dotenv
    const dotenvPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(dotenvPath)) {
      require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: dotenvPath });
    }
    
    const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma/client'));
    const prisma = new PrismaClient();
    
    // Thực thi đếm số sản phẩm thực tế
    const count = await prisma.product.count();
    await prisma.$disconnect();
    
    console.log("Đã kết nối thành công!");
    printStatus("Kết nối database thực tế", true, `-> Neon Postgres ổn định! Đang lưu trữ ${count} sản phẩm.`);
  } catch (e) {
    console.log("Thất bại!");
    printStatus("Kết nối database thực tế", false, `-> Lỗi: ${e.message.replace(/\r?\n/g, ' ').trim()}`);
    overallSuccess = false;
  }

  // 4. Kiểm tra Build Production (Frontend)
  console.log("\n👉 4. KIỂM TRA BIÊN DỊCH PRODUCTION (VITE BUILD):");
  try {
    process.stdout.write("⚡ Đang kiểm tra biên dịch mã nguồn Frontend... ");
    execSync("npm run build", {
      cwd: __dirname,
      stdio: 'ignore'
    });
    console.log("Đã biên dịch thành công!");
    printStatus("Biên dịch mã nguồn Frontend", true, "-> Không có lỗi TypeScript hay cú pháp!");
  } catch (e) {
    console.log("Thất bại!");
    printStatus("Biên dịch mã nguồn Frontend", false, "-> Phát hiện lỗi biên dịch, hãy kiểm tra lại terminal build!");
    overallSuccess = false;
  }

  console.log("\n======================================================================");
  if (overallSuccess) {
    console.log("    🎉  CHẨN ĐOÁN: HỆ THỐNG HOÀN TOÀN KHỎE MẠNH & SẴN SÀNG! 🎉");
    console.log("    Tất cả cơ sở dữ liệu, backend và frontend đã đồng bộ tốt.");
  } else {
    console.log("    ⚠️   CHẨN ĐOÁN: PHÁT HIỆN LỖI HỆ THỐNG! ⚠️");
    console.log("    Vui lòng đọc các cảnh báo [LỖI] màu đỏ phía trên để sửa chữa.");
  }
  console.log("======================================================================\n");
}

main().catch(console.error);
