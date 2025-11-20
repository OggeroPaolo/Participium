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
    throw new Error(".env file does not exist. Cannot create or sync .env.test");
  }

  const envContent = fs.readFileSync(ENV_PATH, "utf8");
  const testEnvExists = fs.existsSync(TEST_ENV_PATH);

  if (!testEnvExists) {
    // Create .env.test if missing
    fs.writeFileSync(TEST_ENV_PATH, envContent);
    return;
  }

  // Compare contents
  const testEnvContent = fs.readFileSync(TEST_ENV_PATH, "utf8");

  if (envContent !== testEnvContent) {
    // Update .env.test if different
    fs.writeFileSync(TEST_ENV_PATH, envContent);
  }
}

export function setupTestEnv() {
  ensureEnvFiles();
  loadEnv({ path: TEST_ENV_PATH });

  // Save original DB_PATH
  originalDbPath = process.env.DB_PATH;

  // Force in-memory DB for tests
  process.env.DB_PATH = ":memory:";
}

export function teardownTestEnv() {
  if (fs.existsSync(TEST_ENV_PATH)) {
    try {
      fs.unlinkSync(TEST_ENV_PATH);
    } catch (err) {
      console.error("[teardown] Error deleting .env.test:", err);
    }
  }

  // Restore original DB_PATH
  if (originalDbPath !== undefined) {
    process.env.DB_PATH = originalDbPath;
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

  try {
    await getDatabase();

    const schemaPath = path.resolve(__dirname, "../../src/db/schema.sql");
    if (!fs.existsSync(schemaPath)) throw new Error("schema.sql not found for test DB init");

    const schema = fs.readFileSync(schemaPath, "utf-8").trim();
    if (schema.length > 0) {
      await execSQL(schema);
    }

    await seedDefaultData();

    dbInitialized = true;
  } catch (err) {
    console.error("[setup] Error initializing test DB:", err);
  }
}

// ---------------------------
// Reset database between tests
// ---------------------------
export async function resetTestDB(): Promise<void> {
  try {
    // ---------------------------
    // Delete tables in dependency order
    // ---------------------------
    const deleteOrder = [
      "photos",
      "reports",
      "users",
      "roles",
      "offices",
      "categories"
    ];

    for (const table of deleteOrder) {
      await runQuery(`DELETE FROM ${table}`);
    }

    // ---------------------------
    // Reset AUTOINCREMENT sequences
    // ---------------------------
    const seqExists = await getOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
    );

    if (seqExists && seqExists.count > 0) {
      await runQuery("DELETE FROM sqlite_sequence");
    }

    // ---------------------------
    // Seed default data
    // ---------------------------
    await seedDefaultData();

    console.log("[setup] Test database reset successfully!");
  } catch (err) {
    console.error("[setup] Error resetting test DB:", err);
  }
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

    // ---------------------------
    // Add Test Reports
    // ---------------------------

    const dbUsers = await getAll<{ id: number }>("SELECT id FROM users");
    const dbCategories = await getAll<{ id: number }>("SELECT id FROM categories");

    const citizenUser = dbUsers[0]; // first user = citizen
    const catWater = dbCategories[0];
    const catRoad = dbCategories[6];
    const catLighting = dbCategories[3];

    const reports = [
      {
        user_id: citizenUser.id,
        category_id: catWater.id,
        title: "Broken water pipe",
        description: "Water is leaking from an underground pipe near the sidewalk.",
        status: "pending_approval",
        position_lat: 40.712776,
        position_lng: -74.005974,
      },
      {
        user_id: citizenUser.id,
        category_id: catRoad.id,
        title: "Pothole in main road",
        description: "Large pothole on the right lane causing traffic slowdown.",
        status: "pending_approval",
        position_lat: 40.713500,
        position_lng: -74.002000,
      },
      {
        user_id: citizenUser.id,
        category_id: catLighting.id,
        title: "Street light not working",
        description: "The street lamp near my house has been off for 3 days.",
        status: "pending_approval",
        position_lat: 40.710200,
        position_lng: -74.007500,
      }
    ];

    for (const r of reports) {
      await runQuery(
        `INSERT INTO reports (
            user_id, category_id, title, description, status, position_lat, position_lng
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          r.user_id,
          r.category_id,
          r.title,
          r.description,
          r.status,
          r.position_lat,
          r.position_lng,
        ]
      );
    }

    console.log("[setup] Default data + test reports seeded successfully!");
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
