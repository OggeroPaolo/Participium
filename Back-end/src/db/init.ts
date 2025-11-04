import { getDatabase, execSQL, runQuery, getOne } from "../config/database.js";
import { logger } from "../config/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database with schema
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Initialize database connection
    getDatabase();
    
    // Read the schema SQL file
    const schemaPath = path.join(__dirname, "schema.sql");
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, "utf-8").trim();
      
      // Only execute if schema file has content
      if (schema.length > 0) {
        await execSQL(schema);
        logger.info("Database schema initialized successfully");
        
        // Seed default data
        await seedDefaultData();
      } else {
        logger.info("Schema file is empty, database initialized without schema");
      }
    } else {
      logger.warn("Schema file not found, database initialized without schema");
    }
    
  } catch (error) {
    logger.error({ error }, "Failed to initialize database");
    throw error;
  }
};

/**
 * Seed default data for the application
 */
const seedDefaultData = async (): Promise<void> => {
  try {
    // Check if we already have roles
    const result = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM roles");
    
    if (result && result.count === 0) {
      logger.info("Seeding default roles...");
      
      // Insert default roles
      await runQuery(
        `INSERT INTO roles (name) VALUES (?)`,
        ["citizen"]
      );
      await runQuery(
        `INSERT INTO roles (name) VALUES (?)`,
        ["org_office_operator"]
      );
      await runQuery(
        `INSERT INTO roles (name) VALUES (?)`,
        ["technical_office_operator"]
      );
      await runQuery(
        `INSERT INTO roles (name) VALUES (?)`,
        ["admin"]
      );

      logger.info("Default roles seeded successfully");
      
      // Seed default categories
      await seedDefaultCategories();
      
    } else {
      logger.info("Database already contains data, skipping seed");
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default data");
    // Don't throw error, as seeding is optional
  }
};

/**
 * Seed default categories
 */
const seedDefaultCategories = async (): Promise<void> => {
  try {
    logger.info("Seeding default categories...");
    
    const categories = [
      {
        name: "Water Supply – Drinking Water",
        description: "Issues related to drinking water supply and quality"
      },
      {
        name: "Architectural Barriers",
        description: "Accessibility issues and architectural barriers"
      },
      {
        name: "Sewer System",
        description: "Sewer system and drainage issues"
      },
      {
        name: "Public Lighting",
        description: "Street lights and public lighting problems"
      },
      {
        name: "Waste",
        description: "Waste management and collection issues"
      },
      {
        name: "Road Signs and Traffic Lights",
        description: "Traffic signs, signals, and traffic light problems"
      },
      {
        name: "Roads and Urban Furnishings",
        description: "Road conditions, potholes, and urban furniture"
      },
      {
        name: "Public Green Areas and Playgrounds",
        description: "Parks, green spaces, and playground maintenance"
      },
      {
        name: "Other",
        description: "Other issues not covered by specific categories"
      }
    ];

    for (const category of categories) {
      await runQuery(
        `INSERT INTO categories (name, description) VALUES (?, ?)`,
        [category.name, category.description]
      );
    }

    logger.info("Default categories seeded successfully");
  } catch (error) {
    logger.error({ error }, "Failed to seed default categories");
  }
};

export default initializeDatabase;
