import fs from "fs";
import path from "path";

const envPath = path.resolve(".env");
const testEnvPath = path.resolve(".env.tests");
const backupPath = path.resolve(".env.backup");

export function ensureEnvFiles() {
  const content = `NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
DB_PATH=:memory:
`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, content, "utf-8");
    console.log("[setup] Created .env file");
  }

  if (!fs.existsSync(testEnvPath)) {
    fs.writeFileSync(testEnvPath, content, "utf-8");
    console.log("[setup] Created .env.tests file");
  }
}

export function setupTestEnv() {
  // Backup original .env
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log("[setup] Original .env backed up");
  }

  // Overwrite .env with .env.tests
  fs.copyFileSync(testEnvPath, envPath);
  console.log("[setup] .env overwritten with .env.tests");
}

export function teardownTestEnv() {
  // Restore original .env from backup
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, envPath);
    fs.unlinkSync(backupPath);
    console.log("[teardown] .env restored and backup deleted");
  }
}

// SQLite database cleaning example
import sqlite3 from "sqlite3";

const DB_PATH = ":memory:"; // in-memory DB for tests

export async function cleanDatabase() {
  console.log("[setup] Using in-memory SQLite DB, no file cleanup needed");
  // If you used file-based SQLite, you would drop tables here
}
