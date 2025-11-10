import fs from "fs";
import path from "path";

const envPath = path.resolve(".env");
const testEnvPath = path.resolve(".env.tests");
const backupPath = path.resolve(".env.backup");

/**
 * Ensure .env.tests exists by copying current .env if not present
 */
export function ensureEnvFiles() {
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file does not exist. Cannot create .env.tests");
  }

  if (!fs.existsSync(testEnvPath)) {
    fs.copyFileSync(envPath, testEnvPath);
    console.log("[setup] Created .env.tests from current .env");
  }
}

/**
 * Setup test environment:
 *  - Backup original .env
 *  - Overwrite .env with .env.tests
 */
export function setupTestEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found, cannot setup test env");
  }

  // Backup original .env
  fs.copyFileSync(envPath, backupPath);
  console.log("[setup] Original .env backed up");

  // Overwrite .env with .env.tests
  if (!fs.existsSync(testEnvPath)) {
    throw new Error(".env.tests file not found. Did you run ensureEnvFiles()?");
  }

  fs.copyFileSync(testEnvPath, envPath);
  console.log("[setup] .env overwritten with .env.tests");
}

/**
 * Teardown test environment:
 *  - Restore original .env from backup
 */
export function teardownTestEnv() {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, envPath);
    fs.unlinkSync(backupPath);
    console.log("[teardown] .env restored from backup");
  } else {
    console.warn("[teardown] No backup found, .env not restored");
  }
}

/**
 * Clean SQLite database (for tests using file DB)
 */
export async function cleanDatabase(dbPath: string = ":memory:") {
  if (dbPath === ":memory:") {
    console.log("[setup] Using in-memory SQLite DB, no file cleanup needed");
    return;
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`[setup] Deleted test database at ${dbPath}`);
  }
}
