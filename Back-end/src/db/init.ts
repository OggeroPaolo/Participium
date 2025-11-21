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
export const seedDefaultData = async (): Promise<void> => {
  try {
    const result = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM roles");
    
    if (result && result.count === 0) {
      const roles = [
        { name: "Citizen", type: "citizen" },
        { name: "Municipal_public_relations_officer", type: "pub_relations" },
        { name: "Technical_office_staff_member", type: "tech_officer" },
        { name: "Water_utility_officer", type: "tech_officer" },
        { name: "Sewer_system_officer", type: "tech_officer" },
        { name: "Admin", type: "admin" }
      ];

      for (const role of roles) {
        await runQuery(
          `INSERT INTO roles (name, type) VALUES (?, ?)`,
          [role.name, role.type]
        );
      }

      await seedDefaultCategories();
      await seedDefaultUsers();
      logger.info("Default data seeded successfully");

    } else {
      logger.info("Database already contains data, skipping seed");
    }
    
  } catch (error) {
    logger.error({ error }, "Failed to seed default data");
  }
};

/**
 * Seed default categories
 */
export const seedDefaultCategories = async (): Promise<void> => {
  try {
    
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
  } catch (error) {
    logger.error({ error }, "Failed to seed default categories");
  }
};

/**
 * Seed default users
 */
export const seedDefaultUsers = async (): Promise<void> => {
  try {
    // Get role IDs dynamically
    const roles = await getAll<{ id: number; name: string }>("SELECT id, name FROM roles");
    const roleMap: Record<string, number> = {};

    roles.forEach(r => {
      roleMap[r.name] = r.id;
    });

    const users = [
      {
        firebase_uid: "QBUqptp5sYa46a2ALU3t8QXRIHz2",
        email: "citizen@example.com",
        username: "JohnDoe",
        first_name: "John",
        last_name: "Doe",
        role_id: roleMap["Citizen"]
      },
      {
        firebase_uid: "QF6qat0SyJcdX91zZINZLaTakM12",
        email: "operator@example.com",
        username: "JaneSmith",
        first_name: "Jane",
        last_name: "Smith",
        role_id: roleMap["Municipal_public_relations_officer"]
      },
      {
        firebase_uid: "CV0ZG2bmDva06EHVdSwcF4rz18F3",
        email: "admin@example.com",
        username: "EmilyCarter",
        first_name: "Emily",
        last_name: "Carter",
        role_id: roleMap["Admin"]
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

  } catch (error) {
    logger.error({ error }, "Failed to seed default users");
  }
};

export default initializeDatabase;
