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
        [u.firebase_uid, u.email, u.username, u.first_name, u.last_name, u.role_id]
      );
    } catch (err) {
      console.error("Error inserting user:", u, err);
      throw err;
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
