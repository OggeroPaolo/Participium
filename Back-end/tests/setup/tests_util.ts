// tests/setup/test_utils.ts
import fs from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import express, { Router } from "express";
import { getDatabase, execSQL, runQuery, getAll, getOne } from "../../src/config/database.js";

let dbInitialized = false;
let originalDbPath: string | undefined; // to store original DB_PATH

// ---------------------------
// Environment setup
// ---------------------------
const ENV_PATH = path.resolve(".env");
const TEST_ENV_PATH = path.resolve(".env.test");

export function ensureEnvFiles() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(".env file does not exist. Cannot create .env.test");
  }

  if (!fs.existsSync(TEST_ENV_PATH)) {
    fs.copyFileSync(ENV_PATH, TEST_ENV_PATH);
    console.log("[setup] Created .env.test from .env");
  }
}

export function setupTestEnv() {
  ensureEnvFiles();
  loadEnv({ path: TEST_ENV_PATH });
  console.log("[setup] Loaded test environment from .env.test");

  // Save original DB_PATH
  originalDbPath = process.env.DB_PATH;

  // Force in-memory DB for tests
  process.env.DB_PATH = ":memory:";
}

export function teardownTestEnv() {
  if (fs.existsSync(TEST_ENV_PATH)) {
    fs.unlinkSync(TEST_ENV_PATH);
    console.log("[teardown] Deleted .env.test after tests");
  }

  // Restore original DB_PATH
  if (originalDbPath !== undefined) {
    process.env.DB_PATH = originalDbPath;
    console.log("[teardown] Restored original DB_PATH");
  } else {
    delete process.env.DB_PATH;
  }
}

// ---------------------------
// Initialize in-memory test database
// ---------------------------
export async function initTestDB(): Promise<void> {
  if (dbInitialized) return;

  setupTestEnv();

  // Initialize database singleton connection
  await getDatabase();

  const schemaPath = path.resolve(__dirname, "../../src/db/schema.sql");
  if (!fs.existsSync(schemaPath)) throw new Error("schema.sql not found for test DB init");

  const schema = fs.readFileSync(schemaPath, "utf-8").trim();
  if (schema.length > 0) {
    await execSQL(schema);
    console.log("[setup] Database schema executed");
  }

  await seedDefaultData();

  dbInitialized = true;
  console.log("[setup] In-memory test DB initialized and seeded");
}

// ---------------------------
// Reset database between tests
// ---------------------------
export async function resetTestDB(): Promise<void> {
  const tables = await getAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );

  for (const { name } of tables) {
    await runQuery(`DELETE FROM ${name}`);
  }

  // Reset SQLite AUTOINCREMENT
  const seqExists = await getOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
  );
  if (seqExists && seqExists.count > 0) {
    await runQuery("DELETE FROM sqlite_sequence");
  }

  await seedDefaultData();
  console.log("[setup] In-memory test DB reset and reseeded");
}

// ---------------------------
// Seed default roles, categories, users
// ---------------------------
async function seedDefaultData(): Promise<void> {
  try {
    // Roles
    const roles = [
      { name: "citizen", type: "user" },
      { name: "org_office_operator", type: "operator" },
      { name: "technical_office_operator", type: "operator" },
      { name: "admin", type: "admin" },
    ];

    for (const role of roles) {
      await runQuery(`INSERT INTO roles (name, type) VALUES (?, ?)`, [role.name, role.type]);
    }

    // Categories
    const categories = [
      { name: "Water Supply – Drinking Water", description: "Issues related to drinking water supply" },
      { name: "Architectural Barriers", description: "Accessibility issues and architectural barriers" },
      { name: "Sewer System", description: "Sewer system and drainage issues" },
      { name: "Public Lighting", description: "Street lights and public lighting problems" },
      { name: "Waste", description: "Waste management and collection issues" },
      { name: "Road Signs and Traffic Lights", description: "Traffic signs, signals, and traffic light problems" },
      { name: "Roads and Urban Furnishings", description: "Road conditions, potholes, and urban furniture" },
      { name: "Public Green Areas and Playgrounds", description: "Parks, green spaces, and playground maintenance" },
      { name: "Other", description: "Other issues not covered by specific categories" },
    ];

    for (const category of categories) {
      await runQuery(`INSERT INTO categories (name, description) VALUES (?, ?)`, [
        category.name,
        category.description,
      ]);
    }

    // Users
    const rolesRows = await getAll<{ id: number; name: string }>("SELECT id, name FROM roles");
    const roleMap: Record<string, number> = {};
    rolesRows.forEach((r) => (roleMap[r.name] = r.id));

    const users = [
      {
        firebase_uid: "uid_citizen",
        email: "citizen@example.com",
        username: "citizen_user",
        first_name: "John",
        last_name: "Doe",
        role_id: roleMap["citizen"],
      },
      {
        firebase_uid: "uid_operator",
        email: "operator@example.com",
        username: "operator_user",
        first_name: "Jane",
        last_name: "Smith",
        role_id: roleMap["org_office_operator"],
      },
      {
        firebase_uid: "admin_uid",
        email: "admin@example.com",
        username: "admin_user",
        first_name: "Alice",
        last_name: "Admin",
        role_id: roleMap["admin"],
      },
    ];

    for (const user of users) {
      await runQuery(
        `INSERT INTO users (firebase_uid, email, username, first_name, last_name, role_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.firebase_uid, user.email, user.username, user.first_name, user.last_name, user.role_id]
      );
    }

    console.log("[setup] Default roles, categories, and users seeded");
  } catch (err) {
    console.error("[setup] Error seeding default data:", err);
  }
}

// ---------------------------
// Express test app helper
// ---------------------------
export function makeTestApp(router: Router) {
  const app = express();
  app.use(express.json());
  app.use("/", router);
  return app;
}
