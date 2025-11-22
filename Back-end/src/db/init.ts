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
      await seedDefaultReports();
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

/**
 * Seed default reports
 */
export const seedDefaultReports = async (): Promise<void> => {
  try {
    const reportCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM reports");
    if (reportCount?.count && reportCount.count > 0) {
      logger.info("Reports already exist, skipping seed");
      return;
    }

    // Get users and categories
    const users = await getAll<{ id: number }>("SELECT id FROM users");
    const categories = await getAll<{ id: number; name: string }>("SELECT id, name FROM categories");

    if (!users.length || !categories.length) {
      logger.warn("Cannot seed reports: no users or categories found");
      return;
    }

    // Use first user and category as fallback
    const firstUser = users[0] ?? { id: 1 };       
    const firstCategory = categories[0] ?? { id: 1 }; 

    const reports = [
      {
        title: "Broken street light",
        description: "The street light on 5th avenue is broken and needs repair.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Public Lighting"))?.id ?? firstCategory.id,
        position_lat: 40.712776,
        position_lng: -74.005974,
        status: "pending_approval"
      },
      {
        title: "Potholes on Main Street",
        description: "Several potholes are damaging vehicles on Main Street.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads"))?.id ?? firstCategory.id,
        position_lat: 40.713776,
        position_lng: -74.004974,
        status: "pending_approval"
      },
      {
        title: "Water leakage in neighborhood",
        description: "A broken water pipe is causing flooding in the area.",
        user_id: users[1]?.id ?? firstUser.id, // fallback to first user
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 40.714776,
        position_lng: -74.003974,
        status: "in_progress"
      }
    ];

    for (const report of reports) {
      await runQuery(
        `INSERT INTO reports 
         (title, description, user_id, category_id, position_lat, position_lng, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          report.title,
          report.description,
          report.user_id,
          report.category_id,
          report.position_lat,
          report.position_lng,
          report.status
        ]
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default reports");
  }
};




export default initializeDatabase;
