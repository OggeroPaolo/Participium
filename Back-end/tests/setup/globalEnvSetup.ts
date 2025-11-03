// tests/setup/globalEnvSetup.ts
import { ensureEnvFiles, setupTestEnv, teardownTestEnv, cleanDatabase } from ".//tests_util.js";

export default async function globalSetup() {
  // Ensure .env and .env.tests exist
  ensureEnvFiles();

  // Setup test environment
  setupTestEnv();

  // Clean DB before tests
  await cleanDatabase();
  console.log("[setup] Test environment ready");

  // Return teardown function that Vitest will call after all tests
  return async () => {
    teardownTestEnv();
    console.log("[teardown] Test environment restored");
  };
}
