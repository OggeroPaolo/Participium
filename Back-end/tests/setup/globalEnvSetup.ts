// tests/setup/globalEnvSetup.ts
import { ensureEnvFiles, setupTestEnv } from "./tests_util.js";
import fs from "fs";
import path from "path";

export default async function setup() {
  // Setup logic
  try {
    ensureEnvFiles();
    setupTestEnv();
    console.log("[setup] Test environment ready (database untouched)");
  } catch (err) {
    console.error("[setup] Failed to setup test environment:", err);
    throw err;
  }

  // Return teardown function
  return async () => {
    try {
      const src = path.resolve(__dirname, "../coverage/lcov.info");
      const dest = path.resolve(__dirname, "../lcov.info");

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`[teardown] Moved lcov.info to ${dest}`);
        // Optionally delete original
        fs.unlinkSync(src);
      }
    } catch (err) {
      console.error("[teardown] Failed to move lcov.info:", err);
    }
  };
}
