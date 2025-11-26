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

      await seedDefaultCategories();
      await seedDefaultOffices();
      await seedDefaultRoles();
      await seedDefaultUsers();
      await seedDefaultReports();
      await seedDefaultPhotos();
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
      { name: "Water Supply – Drinking Water", description: "Issues related to drinking water supply and quality" },
      { name: "Architectural Barriers", description: "Accessibility issues and architectural barriers" },
      { name: "Sewer System", description: "Sewer system and drainage issues" },
      { name: "Public Lighting", description: "Street lights and public lighting problems" },
      { name: "Waste", description: "Waste management and collection issues" },
      { name: "Road Signs and Traffic Lights", description: "Traffic signs, signals, and traffic light problems" },
      { name: "Roads and Urban Furnishings", description: "Road conditions, potholes, and urban furniture" },
      { name: "Public Green Areas and Playgrounds", description: "Parks, green spaces, and playground maintenance" },
      { name: "Other", description: "Other issues not covered by specific categories" }
    ];

    for (const category of categories) {
      // Skip if category already exists
      const existing = await getOne<{ id: number }>("SELECT id FROM categories WHERE name = ?", [category.name]);
      if (!existing) {
        await runQuery(
          `INSERT INTO categories (name, description) VALUES (?, ?)`,
          [category.name, category.description]
        );
      }
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default categories");
  }
};

/**
 * Seed default offices
 */
export const seedDefaultOffices = async (): Promise<void> => {
  try {
    const officeCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM offices");
    if (officeCount?.count && officeCount.count > 0) {
      logger.info("Offices already exist, skipping seed");
      return;
    }

    const categories = await getAll<{ id: number; name: string }>("SELECT id, name FROM categories");

    // One office per category
    for (const category of categories) {
      const result = await runQuery(
        `INSERT INTO offices (name, category_id, type) VALUES (?, ?, ?)`,
        [`${category.name} Office`, category.id, "technical"]
      );
    }

    const orgResult = await runQuery(
      `INSERT INTO offices (name, type) VALUES (?, ?)`,
      ["Organization Office", "organization"]
    );
  } catch (error) {
    logger.error({ error }, "Failed to seed default offices");
  }
};

/**
 * Seed default roles
 */
export const seedDefaultRoles = async (): Promise<void> => {
  try {
    const roleCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM roles");
    if (roleCount?.count && roleCount.count > 0) {
      logger.info("Roles already exist, skipping seed");
      return;
    }

    const categories = await getAll<{ id: number; name: string }>("SELECT id, name FROM categories");
    if (!categories.length) {
      logger.warn("No categories found, skipping roles seeding");
      return;
    }

    const firstCategory: { id: number; name: string } = categories[0]!;

    // Get office IDs
    const offices = await getAll<{ id: number; name: string }>("SELECT id, name FROM offices");
    const officeMap: Record<string, number> = {};
    offices.forEach(o => { officeMap[o.name] = o.id; });

    const getOfficeIdForCategory = (categoryNamePart: string): number => {
      const category = categories.find(c => c.name.includes(categoryNamePart));
      return category ? officeMap[`${category.name} Office`]! : officeMap[`${firstCategory.name} Office`]!;
    };

    const roles: { name: string; type: string; office_id: number | null }[] = [
      { name: "Citizen", type: "citizen", office_id: null },
      { name: "Municipal_public_relations_officer", type: "pub_relations", office_id: officeMap["Organization Office"]! },
      { name: "Water_utility_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Water Supply")! },
      { name: "Sewer_system_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Sewer")! },
      { name: "Public_lightning_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Public Lightning")! },
      { name: "Architectural_barriers_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Architectural Barriers")! },
      { name: "Waste_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Waste")! },
      { name: "Road_signs_urban_furnishings_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Roads and Urban Furnishings")! },
      { name: "Public_green_areas_playgrounds_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Public Green Areas and Playgrounds")! },
      { name: "Admin", type: "admin", office_id: officeMap["Organization Office"]! }
    ];
    for (const role of roles) {
      const existing = await getOne<{ id: number }>("SELECT id FROM roles WHERE name = ?", [role.name]);
      if (!existing) {
        await runQuery(
          `INSERT INTO roles (name, type, office_id) VALUES (?, ?, ?)`,
          [role.name, role.type, role.office_id]
        );
      }
    }

    logger.info("Roles and offices seeded successfully");
  } catch (error) {
    logger.error({ error }, "Failed to seed roles and offices");
  }
};

/**
 * Seed default users
 */
export const seedDefaultUsers = async (): Promise<void> => {
  try {
    const roles = await getAll<{ id: number; name: string }>("SELECT id, name FROM roles");
    const roleMap: Record<string, number> = {};
    roles.forEach(r => { roleMap[r.name] = r.id; });

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
        firebase_uid: "Qyo5a7u15JcU2E6z7yaOgwMvYKy2",
        email: "pub-relations@example.com",
        username: "pub-relations",
        first_name: "Daniel",
        last_name: "Hartman",
        role_id: roleMap["Municipal_public_relations_officer"]
      },
      {
        firebase_uid: "8tgYd6X1zfVYOIJUNOIDonFwUTx2",
        email: "operator-sewer@example.com",
        username: "operator-sewer",
        first_name: "Lena",
        last_name: "Alvarez",
        role_id: roleMap["Sewer_system_officer"]
      },
      {
        firebase_uid: "jm7oNq1RdYMjOA1S23VJopQYVrR2",
        email: "operator-water@example.com",
        username: "operator-water",
        first_name: "Ethan",
        last_name: "Caldwell",
        role_id: roleMap["Water_utility_officer"]
      },
      {
        firebase_uid: "nclvO1Kk2fYQXcNUH4iIr9CLIip1",
        email: "operator-water2@example.com",
        username: "operator-water2",
        first_name: "Marcus",
        last_name: "Bennett",
        role_id: roleMap["Water_utility_officer"]
      },
      {
        firebase_uid: "iT18eWAsjgQ0SBD8isKIFRBG1UD3",
        email: "operator-architectural@example.com",
        username: "operator-architectural",
        first_name: "Gigi",
        last_name: "Proietti",
        role_id: roleMap["Architectural_barriers_officer"]
      },
      {
        firebase_uid: "kv63cdFLJXZfSXsaVVcVM3BDzog1",
        email: "operator-lightning@example.com",
        username: "operator-lightning",
        first_name: "Max",
        last_name: "Casper",
        role_id: roleMap["Public_lightning_officer"]
      },
      {
        firebase_uid: "CVvUKpF0zthFliHMgBmuOe9HtGA2",
        email: "operator-waste@example.com",
        username: "operator-waste",
        first_name: "Joe",
        last_name: "Simpson",
        role_id: roleMap["Waste_officer"]
      },
      {
        firebase_uid: "hrLE2NDZsSaGdVWpzuAsroYrGwF3",
        email: "operator-urban@example.com",
        username: "operator-urban",
        first_name: "Lewis",
        last_name: "Hamilton",
        role_id: roleMap["Road_signs_urban_furnishings_officer"]
      },
      {
        firebase_uid: "vPCfQ4wQoANVEwn7b6U5OFFeAGA2",
        email: "operator-green@example.com",
        username: "operator-green",
        first_name: "Pablo",
        last_name: "Jullones",
        role_id: roleMap["Public_green_areas_playgrounds_officer"]
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
      const existing = await getOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [user.email]);
      if (!existing) {
        await runQuery(
          `INSERT INTO users (firebase_uid, email, username, first_name, last_name, role_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user.firebase_uid, user.email, user.username, user.first_name, user.last_name, user.role_id]
        );
      }
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
      /********************************
       * REAL REPORT ABOUT PORTA NUOVA*
       ********************************/
      {
        title: "Neglected street corner",
        description: "This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        position_lat: 45.06080,
        position_lng: 7.67613,
        status: "pending_approval"
      },
      {
        title: "Fallen Road Sign",
        description: "A road sign has fallen and requires prompt repair.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Road Signs and Traffic Lights"))?.id ?? firstCategory.id,
        position_lat: 45.0632,
        position_lng: 7.6835,
        status: "pending_approval"
      },
      {
        title: "Damaged Bollard",
        description: "A bollard was cracked in an accident and needs repair",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        position_lat: 45.06555,
        position_lng: 7.66233,
        status: "assigned",
        reviewed_by: 3,
        assigned_to: 10
      },
      {
        title: "Wooden Bench with Missing Boards",
        description: "A wooden bench has several missing boards and requires maintenance.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        position_lat: 45.06564,
        position_lng: 7.66166,
        status: "in_progress",
        reviewed_by: 3,
        assigned_to: 10
      },
      {
        title: "accessibility barrier",
        description: "This damaged and uneven sidewalk surface represents an accessibility barrier, especially for people using wheelchairs, walkers, strollers, or those with limited mobility.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        position_lat: 45.06504,
        position_lng: 7.66376,
        status: "suspended",
        reviewed_by: 3,
        assigned_to: 10
      },
      {
        title: "Damaged Road, Hazard for Vehicles",
        description: "This road surface in poor condition, with several cracks, uneven patches, and worn asphalt. These defects can pose challenges for vehicles, as they may cause instability, discomfort, or even damage to tires and suspension systems.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        position_lat: 45.06297,
        position_lng: 7.66937,
        status: "resolved",
        reviewed_by: 3,
        assigned_to: 10
      },
      // THE REST ARE GENERATED
      {
        title: "Water supply assigned",
        description: "Assigned to a technician for water supply issue.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 45.0725,
        position_lng: 7.6824,
        status: "assigned",
        reviewed_by: 3,
        assigned_to: 5
      },
      {
        title: "Water leakage in neighborhood",
        description: "A broken water pipe is causing flooding in the area.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 45.0619,
        position_lng: 7.6860,
        status: "in_progress",
        reviewed_by: 3,
        assigned_to: 6
      },
      {
        title: "Water supply suspended",
        description: "Water supply work has been suspended temporarily.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 45.0793,
        position_lng: 7.6954,
        status: "suspended",
        reviewed_by: 3,
        assigned_to: 6
      },
      {
        title: "Water supply rejected",
        description: "Water supply report rejected for review errors.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 45.0667,
        position_lng: 7.6841,
        status: "rejected",
        note: "this is a rejection note",
        reviewed_by: 3
      },
      {
        title: "Water supply resolved",
        description: "Water supply issue resolved successfully.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        position_lat: 45.0759,
        position_lng: 7.6899,
        status: "resolved",
        reviewed_by: 3,
        assigned_to: 6
      }
    ];

    for (const report of reports) {
      const existing = await getOne<{ id: number }>("SELECT id FROM reports WHERE title = ?", [report.title]);
      if (!existing) {
        await runQuery(
          ` INSERT INTO reports 
            (title, description, user_id, category_id, position_lat, position_lng, status, note, assigned_to, reviewed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            report.title,
            report.description,
            report.user_id,
            report.category_id,
            report.position_lat,
            report.position_lng,
            report.status,
            report.note ?? null,
            report.assigned_to ?? null,
            report.reviewed_by ?? null
          ]
        );
      }
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default reports");
  }
};

/**
 * Seed default photos
 */
export const seedDefaultPhotos = async (): Promise<void> => {
  try {
    const photoCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM photos");
    if (photoCount?.count && photoCount.count > 0) {
      logger.info("Photos already exist, skipping seed");
      return;
    }

    const reports = await getAll<{ id: number; title: string }>("SELECT id, title FROM reports");
    if (!reports.length) {
      logger.warn("No reports found, skipping photo seeding");
      return;
    }

    // For each report, add up to 3 photos
    const photos = [
      // Report 1
      {
        report_id: 1,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/fl_original/v1764143988/Participium-demo/z7z4f0oppqissfj2fd0y.jpg",
        ordering: 1
      },

      // Report 2
      {
        report_id: 2,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764173134/Participium-demo/s3qtgqbr7put0hinwzru.jpg",
        ordering: 1
      },
      {
        report_id: 3,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764172687/Participium-demo/dxsdqsuzurvw8duybjqp.jpg",
        ordering: 1
      },
      // Report 3
      {
        report_id: 3,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764172686/Participium-demo/p8uvfpwvn7eecbweqx5b.jpg",
        ordering: 2
      },
      {
        report_id: 3,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764172685/Participium-demo/ojpjqjffvq5qmww8twam.jpg",
        ordering: 3
      },
      // Report 4
      {
        report_id: 4,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764153275/Participium-demo/wehooeo54qsg89cwgomm.jpg",
        ordering: 1
      },
      {
        report_id: 4,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764153254/Participium-demo/d5juzjkt5t7cenm5ywde.jpg",
        ordering: 2
      },
      {
        report_id: 5,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764187721/Participium/aesk9ovwzv4snyjodlbr.jpg",
        ordering: 1
      },
      {
        report_id: 5,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764187722/Participium/l02kbirjnunohovwdhfg.jpg",
        ordering: 2
      },
      {
        report_id: 6,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764187945/Participium/pueajqkgblpbuncbzjey.jpg",
        ordering: 1
      }
    ];


    for (const photo of photos) {
      await runQuery(
        `INSERT INTO photos (report_id, url, ordering) VALUES (?, ?, ?)`,
        [photo.report_id, photo.url, photo.ordering]
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default photos");
  }
};


export default initializeDatabase;
