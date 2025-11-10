import fs from "fs";
import path from "path";

const envPath = path.resolve(".env");
const testEnvPath = path.resolve(".env.tests");
const backupPath = path.resolve(".env.backup");

export function ensureEnvFiles() {
  const content = `NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
DB_PATH=:memory:
FIREBASE_PROJECT_ID=participium-53ae1
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@participium-53ae1.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDVZP6M71uIzKxy\nhWq0tmoSzA89Fe7DSJ6Ps2PrNYCTdSnQuTJF/DZtJxE2oLRY6AC0W5b6MVN92HVQ\n5QMEEhnr6nyyCmtZfcPM8jUq2SkMjJaY5A7amSb+yHiNIUIv83hTt1eGv/7vN/ij\nnXeSTPx5ENFavjvgRvct8E9ZmZW6yA7mhcyK5E4r67WlsRWhdut/Tr3iHbTDxADJ\nXFwsrXAyGYpPfZk8htUtwJWpf4s0ymy2zJzzchT311TfZSyMRIHkXeTBWsu+yWN5\nrxa5wfm2bFkFRf6PNPj2yg1vQ9cOL7u7cEunMuuY7ekOaghQd994cD/R0aZvAAyd\nmRXjfgadAgMBAAECggEAHkDPetUbZclYoHLMRjr/TlNqTKd9nmd+/VH6NjgzVpR7\nfWkoGLZxU+fAP72oW9tmcCt0+9r+4n5L4ZBaLVtQm/r2OzqRbhJPrlBfW8gGUw5i\ncmIQvgqM9f2fY6jFrK0oj7vUN5kkMC9/+1hBgbcS6yoIeEQ0km8VL4jcgxAsY1qj\nvArAMzafkjFiWfUxk1rDkQYUfbLOSqzm0vs1XgPuWIZpK3F/RiFv2WX+72QePsYQ\n84y1AwdLUb9rgzEEXUZha4pYEe3nzLD/k3YOL5iwsc3/RADbxO6BNN6gWlqV/Lx7\nCXjPyjgMx9PFJWmSQqxaOI6qaszy79e/9iy4a2EUqQKBgQDx/9aKyh61EheEpbE2\nlORjKl+vfBq2UflTr6Zv/UnjdE9+CqyLxlr5oGWqHsqN8V1jvlgQIjMnZIKoR3Ru\np2g4JlWF8u7yUotuTVVChWzJtbahs3cnqkUtrP6dujGWRZ1Db13+Obbmq7k+UcaI\nLxPMObb+gtm0wt5kxw6tpPQEVQKBgQDhvYAdPVmQA3bQUI5G6/7hFdAtEGBUTnMs\n5MDUruwuWoJpgvNSgWLqYxKgSNHjcUdrVLKcbu3RF3XlTQ7VtJFFKfFf3dEs4m2v\ngdDqPFAN/vDwXFmys9uLvb3RswxAPMGed0rQHBrR4aqmFtVr4ttR2reMK512AeJp\n3fKFD9EBKQKBgDXisuIKqZXGJoh54KD3vHc8WzwXFVednzf8N8JeExLbtkupksw4\n6c8F4T1lR9MdeJ8aJj/JbbyKy/EuoAV3r2Q5XPfLpVs9+CAihiae0R+FH9qXvKOP\nbYIDMFrst9fvPlpitPpD3a81c7UlvmBaozzpaQ75EgMHFUA5dtJBlbhVAoGAHSkv\nrZdJRJNN++cMGhlOWaFJvSiKaRmhQ0Fhr5fRJsPGaP7jk9rm/kRCGbaOdoUhprnQ\nQOkLi6EuN6rWqcCjq32ZkrrC1LuDU9K/PCMCbGxsj4A+jhkx2UFvjfFFOd8fW+sp\nHO0kgcxXERGODFvH3TEV2OOheacQqoBjXdEHPNECgYEA7Vq05poDT9ncqM9xjp7b\n+IOTAdbRSqE5c814xajedb4LSESgo98CUIfo2NM22dfMI+51Y0RgHNOp/2C2KDeD\niYsFOMXmKuQBpGSUBWOqQM5mwW0v6rFMVnxin0MX1/gaPKj3oe0c7EmZo0RQb5rh\nwDNtdklf3cVcDBnmdx7MKig=\n-----END PRIVATE KEY-----\n"
`;

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, content, "utf-8");
    console.log("[setup] Created .env file");
  }

  if (!fs.existsSync(testEnvPath)) {
    fs.writeFileSync(testEnvPath, content, "utf-8");
    console.log("[setup] Created .env.tests file");
  }
}

export function setupTestEnv() {
  // Backup original .env
  if (fs.existsSync(envPath)) {
    fs.copyFileSync(envPath, backupPath);
    console.log("[setup] Original .env backed up");
  }

  // Overwrite .env with .env.tests
  fs.copyFileSync(testEnvPath, envPath);
  console.log("[setup] .env overwritten with .env.tests");
}

export function teardownTestEnv() {
  // Restore original .env from backup
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, envPath);
    fs.unlinkSync(backupPath);
    console.log("[teardown] .env restored and backup deleted");
  }
}

// SQLite database cleaning example
import sqlite3 from "sqlite3";

const DB_PATH = ":memory:"; // in-memory DB for tests

export async function cleanDatabase() {
  console.log("[setup] Using in-memory SQLite DB, no file cleanup needed");
  // If you used file-based SQLite, you would drop tables here
}
