import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import express, { Router } from "express";
import {
  getDatabase,
  execSQL,
  runQuery,
  getAll,
  getOne,
} from "../../src/config/database.js";

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
  process.env.DB_PATH = ":memory:";
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
// LOAD REAL SCHEMA (WITHOUT TRIGGERS)
// ----------------------------------
async function loadSchema() {
  const schemaPath = path.resolve(__dirname, "../../src/db/schema.sql");
  if (!fs.existsSync(schemaPath)) throw new Error("schema.sql not found");

  let raw = fs.readFileSync(schemaPath, "utf-8");

  // remove SQL comments
  raw = raw.replace(/--.*$/gm, "");

  // remove triggers safely
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
// DEFAULT SEED DATA 
// ----------------------------------
async function seedDefaultData() {
  // roles
  const roles = [
    { name: "citizen", type: "user" },
    { name: "org_office_operator", type: "operator" },
    { name: "technical_office_operator", type: "operator" },
    { name: "admin", type: "admin" },
  ];

  for (const r of roles) {
    try {
      await runQuery(
        `INSERT INTO roles (name, type) VALUES (?, ?)`,
        [r.name, r.type]
      );
    } catch (err) {
      console.error("Error inserting role:", r, err);
      throw err;
    }
  }

  // categories
  const categories = [
    { name: "Water Supply – Drinking Water", description: "Issues related to drinking water supply and quality" },
    { name: "Architectural Barriers", description: "Accessibility issues and architectural barriers" },
    { name: "Sewer System", description: "Sewer system and drainage issues" },
    { name: "Public Lighting", description: "Street lights and public lighting problems" },
    { name: "Waste", description: "Waste management and collection issues" },
    { name: "Road Signs and Traffic Lights", description: "Traffic signs, signals, and traffic light problems" },
    { name: "Roads and Urban Furnishings", description: "Road conditions, potholes, and urban furniture" },
    { name: "Public Green Areas and Playgrounds", description: "Parks, green spaces, and playground maintenance" },
    { name: "Other", description: "Other issues not covered by specific categories" },
  ];

  for (const c of categories) {
    try {
      await runQuery(
        `INSERT INTO categories (name, description) VALUES (?, ?)`,
        [c.name, c.description]
      );
    } catch (err) {
      console.error("Error inserting category:", c, err);
      throw err;
    }
  }

  // users
  const rolesMap = Object.fromEntries(
    (await getAll<{ id: number; name: string }>("SELECT id, name FROM roles"))
      .map(r => [r.name, r.id])
  );

  const users = [
    {
      firebase_uid: "uid_citizen",
      email: "citizen@example.com",
      username: "citizen_user",
      first_name: "John",
      last_name: "Doe",
      role_id: rolesMap["citizen"],
    },
    {
      firebase_uid: "uid_operator",
      email: "operator@example.com",
      username: "operator_user",
      first_name: "Jane",
      last_name: "Smith",
      role_id: rolesMap["org_office_operator"],
    },
    {
      firebase_uid: "admin_uid",
      email: "admin@example.com",
      username: "admin_user",
      first_name: "Alice",
      last_name: "Admin",
      role_id: rolesMap["admin"],
    },
  ];

  for (const u of users) {
    try {
      await runQuery(
        `INSERT INTO users (firebase_uid, email, username, first_name, last_name, role_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [u.firebase_uid, u.email, u.username, u.first_name, u.last_name, u.role_id]
      );
    } catch (err) {
      console.error("Error inserting user:", u, err);
      throw err;
    }
  }
}


// ----------------------------------
// INIT TEST DB
// ----------------------------------
export async function initTestDB(): Promise<void> {
  if (!dbInitialized) {
    setupTestEnv();
    await getDatabase();
    await loadSchema();
    await seedDefaultData();
    dbInitialized = true;
  }
}

// ----------------------------------
// RESET TEST DB (CLEAR + RESEED)
// ----------------------------------
export async function resetTestDB(): Promise<void> {
  const tables = await getAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );

  for (const { name } of tables) {
    await runQuery(`DELETE FROM ${name}`);
  }

  const seqExists = await getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'`
  );

  if (seqExists?.count) {
    await runQuery("DELETE FROM sqlite_sequence");
  }

  // Insert defaults again
  await seedDefaultData();
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
