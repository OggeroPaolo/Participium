import { getDatabase, execSQL, runQuery, getOne, getAll } from "../config/database.js";
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
      const roles = [
        { name: "citizen", type: "citizen" },
        { name: "org_office_operator", type: "operator" },
        { name: "technical_office_operator", type: "operator" },
        { name: "admin", type: "admin" }
      ];

      for (const role of roles) {
        await runQuery(
          `INSERT INTO roles (name, type) VALUES (?, ?)`,
          [role.name, role.type]
        );
      }

      logger.info("Default roles seeded successfully");

      // Seed default categories
      await seedDefaultCategories();

      // Seed default users
      await seedDefaultUsers();
      
    } else {
      logger.info("Database already contains data, skipping seed");
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default data");
    // Don't throw error, as seeding is optional
  }
};

/**
 * Seed default users
 */
const seedDefaultUsers = async (): Promise<void> => {
  try {
    logger.info("Seeding default users...");

    // Get role IDs dynamically
    const roles = await getAll<{ id: number; name: string }>("SELECT id, name FROM roles");
    const roleMap: Record<string, number> = {};
    roles.forEach(r => {
      roleMap[r.name] = r.id;
    });

    const users = [
      {
        firebase_uid: "uid_citizen",
        email: "citizen@example.com",
        username: "citizen_user",
        first_name: "John",
        last_name: "Doe",
        role_id: roleMap["citizen"]
      },
      {
        firebase_uid: "uid_operator",
        email: "operator@example.com",
        username: "operator_user",
        first_name: "Jane",
        last_name: "Smith",
        role_id: roleMap["org_office_operator"]
      },
      {
        firebase_uid: "QS9bJobR9SMi1eaWVNjrNSsQK4g1",
        email: "test@example.com",
        username: "admin_user",
        first_name: "Alice",
        last_name: "Admin",
        role_id: roleMap["admin"]
      }
    ];

    for (const user of users) {
      await runQuery(
        `INSERT INTO users 
          (firebase_uid, email, username, first_name, last_name, role_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.firebase_uid,
          user.email,
          user.username,
          user.first_name,
          user.last_name,
          user.role_id
        ]
      );
    }

    logger.info("Default users seeded successfully");
  } catch (error) {
    logger.error({ error }, "Failed to seed default users");
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
