import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import express, { Router } from "express";
import {getDatabase,execSQL,runQuery,getAll,getOne} from "../../src/config/database.js";

import {seedDefaultData} from "../../src/db/init.js";

let dbInitialized = false;
let originalDbPath: string | undefined;

// ----------------------------------
// ENV SETUP
// ----------------------------------
const ENV_PATH = path.resolve(".env");
const TEST_ENV_PATH = path.resolve(".env.test");

export function ensureEnvFiles() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(".env file does not exist.");
  }
  if (!fs.existsSync(TEST_ENV_PATH)) {
    fs.copyFileSync(ENV_PATH, TEST_ENV_PATH);
  }
}

export function setupTestEnv() {
  ensureEnvFiles();
  loadEnv({ path: TEST_ENV_PATH });

  originalDbPath = process.env.DB_PATH;
  process.env.DB_PATH = ":memory:"; // in-memory DB for tests
}

export function teardownTestEnv() {
  if (fs.existsSync(TEST_ENV_PATH)) {
    try {
      fs.unlinkSync(TEST_ENV_PATH);
    } catch {}
  }
  if (originalDbPath) process.env.DB_PATH = originalDbPath;
  else delete process.env.DB_PATH;
}

// ----------------------------------
// LOAD REAL SCHEMA WITHOUT TRIGGERS
// ----------------------------------
async function loadSchema() {
  const schemaPath = path.resolve(__dirname, "../../src/db/schema.sql");
  if (!fs.existsSync(schemaPath)) throw new Error("schema.sql not found");

  let raw = fs.readFileSync(schemaPath, "utf-8");

  // remove SQL comments
  raw = raw.replace(/--.*$/gm, "");

  // remove triggers
  raw = raw.replace(/CREATE\s+TRIGGER[\s\S]*?END\s*;/gi, "");

  const statements = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await execSQL(stmt + ";");
  }
}

// ----------------------------------
// INIT TEST DB (CLEAN + SEED WITH APP LOGIC)
// ----------------------------------
export async function initTestDB(): Promise<void> {
  if (!dbInitialized) {
    setupTestEnv();
    await getDatabase();
    await loadSchema();

    // Use your new real application seeding.
    await seedDefaultData();

    dbInitialized = true;
  }
}

// ----------------------------------
// RESET TEST DB
// ----------------------------------
export async function resetTestDB(): Promise<void> {
  try {
    // Disable foreign key checks
    await runQuery("PRAGMA foreign_keys = OFF");

    // Clear all tables
    const tables = await getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    for (const { name } of tables) {
      await runQuery(`DELETE FROM ${name}`);
    }

    // Reset autoincrement
    const seqExists = await getOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
    );
    if (seqExists?.count) {
      await runQuery("DELETE FROM sqlite_sequence");
    }

    // Re-enable foreign key checks
    await runQuery("PRAGMA foreign_keys = ON");

    // Re-seed
    await seedDefaultData();
  } catch (error) {
    console.error("Error resetting test database:", error);
    throw error;
  }
}


// ----------------------------------
// EXPRESS TEST APP
// ----------------------------------
export function makeTestApp(router: Router) {
  const app = express();
  app.use(express.json());
  app.use("/", router);
  return app;
}
