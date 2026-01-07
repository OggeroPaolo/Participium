import sqlite3 from "sqlite3";
import { env } from "./env.js";
import { logger } from "./logger.js";
import path from "node:path";
import fs from "node:fs";

let db: any = null;

/**
 * Get the database instance (singleton pattern)
 */
export const getDatabase = (): any => {
  if (!db) {
    // Ensure the directory exists
    const dbDir = path.dirname(env.DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }

    // Enable verbose mode in development
    const sqlite = env.NODE_ENV === "development" ? sqlite3.verbose() : sqlite3;

    // Create/open the database
    db = new sqlite.Database(env.DB_PATH, (err: Error | null) => {
      if (err) {
        logger.error({ err }, "Failed to connect to database");
        throw err;
      }
      logger.info(`Database connected: ${env.DB_PATH}`);
    });

    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON", (err: Error | null) => {
      if (err) {
        logger.error({ err }, "Failed to enable foreign keys");
      }
    });
  }

  return db;
};

/**
 * Run a SQL query (for queries that don't return rows)
 */
export const runQuery = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/*
 * Update rows (returns the number of rows modified)
 */

export const Update = (sql: string, params: any[] = []): Promise<{ changes: number; lastID?: number }> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
};

/**
 * Get a single row from the database
 */
export const getOne = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err: Error | null, row: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(row as T);
      }
    });
  });
};

/**
 * Get all rows from the database
 */
export const getAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err: Error | null, rows: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
};

/**
 * Execute raw SQL (for schema creation)
 */
export const execSQL = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.exec(sql, (err: Error | null) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Close the database connection
 */
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err: Error | null) => {
        if (err) {
          logger.error({ err }, "Error closing database");
          reject(err);
        } else {
          db = null;
          logger.info("Database connection closed");
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

/**
 * Begins a transaction
 */
export const beginTransaction = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.run("BEGIN TRANSACTION", (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }

  });
};

/**
 * Commits of the transaction
 */
export const commitTransaction = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.run("COMMIT", (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }

  });
};

/**
 * Rollback of the transaction
 */
export const rollbackTransaction = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.run("ROLLBACK", (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
};

export default getDatabase;

