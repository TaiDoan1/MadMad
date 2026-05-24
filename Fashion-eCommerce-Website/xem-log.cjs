/**
 * MADMAD STUDIO - LIVE LOG MONITOR v2.1
 * Chay: node xem-log.cjs
 * Hien thi trang thai he thong, log loi chi tiet va thong ke don hang.
 * Ghi tat ca log vao file local: madmad-monitor.log
 * 
 * NANG CAP MOI:
 * - Nhan [Space] hoac [P] de tam dung auto-refresh, thoai mai cuon terminal doc log cu.
 * - Nhan [L] de loc theo muc do loi (ALL, CRITICAL, ERROR, WARNING, INFO, SUCCESS).
 * - Nhan [S] de loc theo nguon (ALL, BACKEND, FRONTEND).
 * - Nhan [R] de lam moi du lieu lap tuc.
 * - Nhan [Up/Down] hoac [+/-] de tang/giam so luong log muon xem.
 * - Nhan [C] de xoa sach noi dung file log local.
 */

const https  = require("https");
const http   = require("http");
const fs     = require("fs");
const path   = require("path");

// ─── CAU HINH & TRANG THAI MONITOR ────────────────────────────────────────────
const BACKEND_URL      = "https://madmad-backend.vercel.app";
const POLL_INTERVAL_MS = 8000;
const LOG_FILE         = path.join(__dirname, "madmad-monitor.log");

let isPaused = false;
let logLimit = 15;
let levelFilter = "all";
let sourceFilter = "all";

// ─── MAU SAC TERMINAL ─────────────────────────────────────────────────────────
const C = {
  reset:   "\x1b[0m",   bold:    "\x1b[1m",   dim:     "\x1b[2m",
  red:     "\x1b[91m",  yellow:  "\x1b[93m",  green:   "\x1b[92m",
  cyan:    "\x1b[96m",  blue:    "\x1b[94m",  magenta: "\x1b[95m",
  white:   "\x1b[97m",  gray:    "\x1b[90m",
};

// ─── TIEN ICH ─────────────────────────────────────────────────────────────────
function nowVN() {
  return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function writeToFile(text) {
  const clean = text.replace(/\x1b\[[0-9;]*m/g, ""); // Xoa ma mau khi ghi file
  fs.appendFileSync(LOG_FILE, clean + "\n", "utf8");
}

function log(text) {
  console.log(text);
  writeToFile(text);
}

// Timeout mac dinh 20s de xu ly Vercel cold start (co the mat 5-15 giay)
function fetchJson(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error",   reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("TIMEOUT")); });
  });
}

// Fetch co retry: neu timeout lan 1 se thu lai lan 2 truoc khi bao loi
async function fetchJsonWithRetry(url, timeoutMs = 20000) {
  try {
    return await fetchJson(url, timeoutMs);
  } catch (e) {
    // Thu lai lan 2 (Vercel co the van dang warm up)
    return await fetchJson(url, timeoutMs);
  }
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function printHeader() {
  console.clear();
  const line = "=".repeat(65);
  log(`${C.bold}${C.cyan}${line}${C.reset}`);
  log(`${C.bold}${C.cyan}   MADMAD STUDIO  |  LIVE LOG MONITOR v2.1${C.reset}`);
  log(`${C.bold}${C.cyan}${line}${C.reset}`);
  log(`${C.gray}Server  : ${BACKEND_URL}${C.reset}`);
  log(`${C.gray}Trangthai: ${isPaused ? C.yellow + C.bold + "TAM DUNG (PAUSED)" : C.green + "DANG HOAT DONG (MONITORING...)"}${C.reset}${C.gray} | Cap nhat: ${POLL_INTERVAL_MS / 1000}s${C.reset}`);
  log(`${C.gray}Bo loc  : Level=${C.white}${levelFilter.toUpperCase()}${C.gray} | Source=${C.white}${sourceFilter.toUpperCase()}${C.gray} | Limit=${C.white}${logLimit}${C.reset}`);
  log(`${C.gray}Phim tat: [Space/P] Pause/Resume | [R] Refresh | [L] Level | [S] Source | [+/-] Limit | [C] Clear Log File${C.reset}`);
  log(`${C.gray}File log: ${LOG_FILE}${C.reset}`);
  log(`${C.yellow}LUU Y   : Backend tren Vercel co the mat 5-15s lan dau (cold start). Timeout duoc dat 20s.${C.reset}`);
  log("");
}

// ─── PHAN 1: TRANG THAI API ───────────────────────────────────────────────────
async function checkHealth() {
  log(`${C.bold}[1] TRANG THAI HE THONG${C.reset}`);
  log(`${C.gray}${"-".repeat(65)}${C.reset}`);

  const endpoints = [
    { name: "Backend root   ", url: `${BACKEND_URL}/` },
    { name: "Products API   ", url: `${BACKEND_URL}/api/products` },
    { name: "Orders API     ", url: `${BACKEND_URL}/api/orders` },
    { name: "Members API    ", url: `${BACKEND_URL}/api/members` },
    { name: "Logs API       ", url: `${BACKEND_URL}/api/logs?limit=1` },
  ];

  for (const ep of endpoints) {
    const t0 = Date.now();
    try {
      const { status } = await fetchJsonWithRetry(ep.url, 20000);
      const ms  = Date.now() - t0;
      const ok  = status >= 200 && status < 400;
      const sColor = ok ? C.green : C.red;
      // Thang diem toc do: phan biet warm vs cold start
      const mColor = ms < 600 ? C.green : ms < 3000 ? C.yellow : ms < 10000 ? C.magenta : C.red;
      const grade  = ms < 600   ? "NHANH (warm)"
                   : ms < 3000  ? "BINH THUONG"
                   : ms < 10000 ? "CHAM - co the do cold start Vercel"
                   :              "RAT CHAM - can kiem tra lai";
      log(`  ${ok ? "[OK] " : "[LOI]"} ${C.white}${ep.name}${C.reset}  HTTP ${sColor}${status}${C.reset}  |  ${mColor}${ms}ms${C.reset}  (${grade})`);
    } catch (e) {
      const ms = Date.now() - t0;
      // Phan biet cold start (timeout < 25s) vs server that su bi loi
      if (ms < 25000) {
        log(`  ${C.yellow}[COLD START?]${C.reset} ${ep.name}  ${C.yellow}Server dang "thuc giac" (${ms}ms). Nhan [R] de thu lai sau 10-15 giay.${C.reset}`);
        writeToFile(`[WARNING] ${nowVN()} ${ep.name.trim()} COLD_START ${ms}ms - Server Vercel dang khoi dong lai`);
      } else {
        log(`  ${C.red}[!!! KHONG PHAN HOI]${C.reset} ${ep.name}  ${C.red}TIMEOUT ${ms}ms - Kiem tra lai backend/Vercel!${C.reset}`);
        writeToFile(`[CRITICAL] ${nowVN()} ${ep.name.trim()} TIMEOUT ${ms}ms`);
      }
    }
  }
  log("");
}

// ─── PHAN 2: LOG LOI TU KHACH HANG ───────────────────────────────────────────
async function checkLogs() {
  log(`${C.bold}[2] NHAT KY LOI HE THONG & KHACH HANG${C.reset}`);
  log(`${C.gray}${"-".repeat(65)}${C.reset}`);

  try {
    let logsUrl = `${BACKEND_URL}/api/logs?limit=${logLimit}`;
    if (levelFilter !== "all") logsUrl += `&level=${levelFilter}`;
    if (sourceFilter !== "all") logsUrl += `&source=${sourceFilter}`;

    // Lay ca tom tat va chi tiet
    const [summaryRes, logsRes] = await Promise.all([
      fetchJson(`${BACKEND_URL}/api/logs/summary`),
      fetchJson(logsUrl),
    ]);

    // Hien thi tom tat 24h
    if (summaryRes.status === 200 && summaryRes.body) {
      const s = summaryRes.body;
      const hasIssues = s.critical > 0 || s.error > 0;
      log(`  Tong hop 24 gio qua: Tong=${s.total}  |  ${C.red}CRITICAL:${s.critical}  LOI:${s.error}${C.reset}  |  ${C.yellow}CANH BAO:${s.warning}${C.reset}  |  ${C.cyan}INFO:${s.info}${C.reset}`);
      if (hasIssues) {
        log(`  ${C.red}${C.bold}>>> CO LOI CAN XU LY! Xem chi tiet ben duoi. <<<${C.reset}`);
      } else {
        log(`  ${C.green}Khong co loi nghiem trong trong 24 gio qua. He thong on dinh!${C.reset}`);
      }
      log("");
    }

    // Hien thi chi tiet tung log
    if (logsRes.status === 200 && Array.isArray(logsRes.body)) {
      const logs = logsRes.body;

      if (logs.length === 0) {
        log(`  ${C.green}[OK] Khong tim thay log nao phu hop bo loc.${C.reset}`);
        log("");
        return;
      }

      log(`  Hien thi ${logs.length} log gan nhat (Loc: level=${levelFilter}, source=${sourceFilter}):`);
      log(`  ${C.gray}${"-".repeat(62)}${C.reset}`);

      for (const entry of logs) {
        const lvl = (entry.level || "info").toUpperCase();
        let levelColor, icon;
        switch (entry.level) {
          case "critical": levelColor = C.red;     icon = "[!!!]"; break;
          case "error":    levelColor = C.red;     icon = "[LOI]"; break;
          case "warning":  levelColor = C.yellow;  icon = "[!]  "; break;
          case "success":  levelColor = C.green;   icon = "[OK] "; break;
          default:         levelColor = C.cyan;    icon = "[i]  "; break;
        }

        const src  = entry.source === "frontend" ? `${C.magenta}[FRONTEND]${C.reset}` : `${C.blue}[BACKEND] ${C.reset}`;
        const time = new Date(entry.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

        log(`  ${levelColor}${icon}${C.reset} ${src} ${C.gray}${time}${C.reset}`);
        log(`       ${C.white}${C.bold}${entry.message}${C.reset}`);

        if (entry.url) {
          log(`       ${C.gray}Trang: ${entry.url}${C.reset}`);
        }
        if (entry.ip && entry.ip !== "unknown") {
          log(`       ${C.gray}IP: ${entry.ip}${C.reset}`);
        }
        if (entry.userAgent) {
          // Rut gon thong tin thiet bi cho de doc
          let device = entry.userAgent;
          if (device.includes("iPhone"))      device = "iPhone (Safari/iOS)";
          else if (device.includes("Android")) device = "Android (" + (device.includes("Chrome") ? "Chrome" : "Browser") + ")";
          else if (device.includes("Windows")) device = "Windows PC (" + (device.includes("Chrome") ? "Chrome" : device.includes("Firefox") ? "Firefox" : "Browser") + ")";
          log(`       ${C.gray}Thiet bi: ${device}${C.reset}`);
        }
        if (entry.details) {
          try {
            const d = typeof entry.details === "string" ? JSON.parse(entry.details) : entry.details;
            if (d.stack) {
              const firstLine = d.stack.split("\n").find(l => l.trim().startsWith("at ")) || "";
              log(`       ${C.gray}Vi tri: ${firstLine.trim()}${C.reset}`);
            }
            if (d.method && d.path) {
              log(`       ${C.gray}API: ${d.method} ${d.path}${C.reset}`);
            }
          } catch {}
        }
        if (entry.duration) {
          log(`       ${C.gray}Thoi gian xu ly: ${entry.duration}ms${C.reset}`);
        }
        log(`       ${C.gray}${"-".repeat(58)}${C.reset}`);
      }
    } else if (logsRes.status === 404) {
      log(`  ${C.yellow}[!] API /api/logs chua san sang.${C.reset}`);
    } else {
      log(`  ${C.red}[LOI] Khong the tai danh sach log (HTTP ${logsRes.status}).${C.reset}`);
    }
  } catch (err) {
    log(`  ${C.red}[LOI KET NOI] ${err.message}${C.reset}`);
  }
  log("");
}

// ─── PHAN 3: THONG KE DON HANG ────────────────────────────────────────────────
async function checkStats() {
  log(`${C.bold}[3] THONG KE DON HANG${C.reset}`);
  log(`${C.gray}${"-".repeat(65)}${C.reset}`);

  try {
    const { status, body: orders } = await fetchJson(`${BACKEND_URL}/api/orders`);

    if (status !== 200 || !Array.isArray(orders)) {
      log(`  ${C.red}[LOI] Khong the tai du lieu don hang.${C.reset}`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending    = orders.filter(o => o.status === "pending");
    const processing = orders.filter(o => o.status === "processing");
    const shipping   = orders.filter(o => o.status === "shipping");
    const completed  = orders.filter(o => o.status === "completed");
    const cancelled  = orders.filter(o => o.status === "cancelled");
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
    const unpaid     = orders.filter(o => !o.isPaid && o.status !== "cancelled");

    const totalRevenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    const fmt = (n) => n.toLocaleString("vi-VN") + "d";

    log(`  Tong don hang  : ${C.bold}${orders.length}${C.reset}`);
    log(`  Don hom nay    : ${C.bold}${C.cyan}${todayOrders.length}${C.reset}`);
    log(`  Cho xac nhan   : ${pending.length > 0    ? C.yellow : C.green}${pending.length}${C.reset}${pending.length > 5 ? "  <-- Nhieu don dang cho!" : ""}`);
    log(`  Dang xu ly     : ${C.cyan}${processing.length}${C.reset}`);
    log(`  Dang giao hang : ${C.blue}${shipping.length}${C.reset}`);
    log(`  Hoan thanh     : ${C.green}${completed.length}${C.reset}`);
    log(`  Da huy         : ${cancelled.length > 0  ? C.red : C.gray}${cancelled.length}${C.reset}`);
    log(`  Chua thanh toan: ${unpaid.length > 0      ? C.yellow : C.green}${unpaid.length}${C.reset}${unpaid.length > 3 ? "  <-- Nen theo doi!" : ""}`);
    log(`  Doanh thu (HT) : ${C.green}${C.bold}${fmt(totalRevenue)}${C.reset}`);

    if (pending.length > 0) {
      log("");
      log(`  ${C.yellow}Don can xu ly ngay:${C.reset}`);
      pending.slice(0, 5).forEach(o => {
        const t = new Date(o.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        log(`    - ${C.white}${o.orderNumber}${C.reset}  |  ${o.customerName}  |  ${fmt(o.total)}  |  ${C.gray}${t}${C.reset}`);
      });
    }
  } catch (err) {
    log(`  ${C.red}[LOI] ${err.message}${C.reset}`);
  }
  log("");
}

// ─── VONG LAP CHINH ───────────────────────────────────────────────────────────
async function run() {
  // Ghi header vao file log
  writeToFile("\n" + "=".repeat(65));
  writeToFile(`MADMAD STUDIO - MONITOR BAT DAU: ${nowVN()}`);
  writeToFile("=".repeat(65));

  async function tick(forced = false) {
    if (isPaused && !forced) return;
    printHeader();
    await checkHealth();
    await checkLogs();
    await checkStats();
    log(`${C.gray}${"=".repeat(65)}${C.reset}`);
    if (isPaused) {
      log(`${C.yellow}${C.bold}[TAM DUNG AUTO-REFRESH] Nhan Space/P de tiep tuc.${C.reset}`);
    } else {
      log(`${C.gray}Dang theo doi... Cap nhat sau ${POLL_INTERVAL_MS / 1000}s. [Q hoac Ctrl+C de thoat]${C.reset}`);
    }
  }

  // Dang ky phim bam
  const readline = require("readline");
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  process.stdin.on("keypress", async (str, key) => {
    if (key.ctrl && key.name === "c") {
      process.exit();
    }
    const name = key.name || "";
    if (name === "q") {
      process.exit();
    }

    if (name === "space" || name === "p") {
      isPaused = !isPaused;
      if (isPaused) {
        printHeader();
        log(`\n  ${C.yellow}${C.bold}[TAM DUNG] Da tam dung auto-refresh. Nhan Space hoac P de tiep tuc.${C.reset}`);
        log(`  ${C.gray}Ban co the thoai mai cuon terminal de xem log cu ma khong so bi tu dong day len.${C.reset}\n`);
      } else {
        log(`\n  ${C.green}Dang bat lai auto-refresh...${C.reset}\n`);
        await tick(true);
      }
    } else if (name === "r") {
      log(`\n  ${C.cyan}Dang lam moi du lieu lap tuc...${C.reset}\n`);
      await tick(true);
    } else if (name === "l") {
      const levels = ["all", "critical", "error", "warning", "info", "success"];
      const idx = levels.indexOf(levelFilter);
      levelFilter = levels[(idx + 1) % levels.length];
      log(`\n  ${C.cyan}Loc muc do log: ${levelFilter.toUpperCase()}${C.reset}\n`);
      await tick(true);
    } else if (name === "s") {
      const sources = ["all", "backend", "frontend"];
      const idx = sources.indexOf(sourceFilter);
      sourceFilter = sources[(idx + 1) % sources.length];
      log(`\n  ${C.cyan}Loc nguon log: ${sourceFilter.toUpperCase()}${C.reset}\n`);
      await tick(true);
    } else if (name === "up" || str === "+") {
      logLimit = Math.min(100, logLimit + 5);
      log(`\n  ${C.cyan}Tang gioi han log hien thi: ${logLimit}${C.reset}\n`);
      await tick(true);
    } else if (name === "down" || str === "-") {
      logLimit = Math.max(5, logLimit - 5);
      log(`\n  ${C.cyan}Giam gioi han log hien thi: ${logLimit}${C.reset}\n`);
      await tick(true);
    } else if (name === "c") {
      try {
        fs.writeFileSync(LOG_FILE, "", "utf8");
        log(`\n  ${C.green}Da xoa sach noi dung file log local (madmad-monitor.log).${C.reset}\n`);
      } catch (e) {
        log(`\n  ${C.red}Loi khi xoa file log local: ${e.message}${C.reset}\n`);
      }
    }
  });

  await tick();
  
  // Set intervals
  setInterval(async () => {
    await tick();
  }, POLL_INTERVAL_MS);
}

run().catch(err => {
  console.error("Loi khoi dong:", err.message);
  process.exit(1);
});
