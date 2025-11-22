// tests/setup/globalEnvSetup.ts
import { ensureEnvFiles, setupTestEnv } from "./tests_util.js";

export default async function globalSetup() {
  try {
    ensureEnvFiles();

    // Load test environment variables from .env.test
    setupTestEnv();

    console.log("[setup] Test environment ready (database untouched)");
  } catch (err) {
    console.error("[setup] Failed to setup test environment:", err);
    throw err;
  }
}
