import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma";

const MIGRATION_FILES = [
  "add_gift_products.sql",
  "add_marketing_gifts.sql",
  "add_order_edit_tracking.sql",
  "add_stock_movements.sql",
  "add_received_stock.sql",
  "add_preorder_fulfilled.sql",
] as const;

let migrationPromise: Promise<{ applied: string[] }> | null = null;

function resolveMigrationsDir() {
  const candidates = [
    path.join(process.cwd(), "prisma/migrations"),
    path.join(process.cwd(), "backend/prisma/migrations"),
    path.join(__dirname, "../../prisma/migrations"),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  throw new Error("Không tìm thấy thư mục prisma/migrations");
}

function splitSqlStatements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function runPendingDatabaseMigrations() {
  const migrationsDir = resolveMigrationsDir();
  const applied: string[] = [];

  for (const fileName of MIGRATION_FILES) {
    const filePath = path.join(migrationsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Thiếu file migration: ${fileName}`);
    }

    await runSqlFile(filePath);
    applied.push(fileName);
  }

  return { applied };
}

export function ensureDatabaseMigrations() {
  if (!migrationPromise) {
    migrationPromise = runPendingDatabaseMigrations().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }

  return migrationPromise;
}
