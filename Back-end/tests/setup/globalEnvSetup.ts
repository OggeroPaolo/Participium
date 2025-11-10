// tests/setup/globalEnvSetup.ts
import { ensureEnvFiles, setupTestEnv, cleanDatabase } from "../setup/tests_util.js";

export default async function globalSetup() {
  try {
    // Ensure .env.tests exists (copy from .env if needed)
    ensureEnvFiles();

    // Backup .env and overwrite with .env.tests
    setupTestEnv();

    // Clean the database before tests
    await cleanDatabase();
    console.log("[setup] Test environment ready");
  } catch (err) {
    console.error("[setup] Failed to setup test environment:", err);
    throw err;
  }
}
