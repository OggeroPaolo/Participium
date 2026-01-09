import { getDatabase, execSQL, runQuery, getOne, getAll } from "../config/database.js";
import { logger } from "../config/logger.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
    await seedDefaultCategories();
    await seedDefaultOffices();
    await seedDefaultCompanies();
    await seedDefaultRoles();
    await seedDefaultUsers();
    await seedDefaultReports();
    await seedDefaultComments();
    await seedDefaultPhotos();
    await seedDefaultNotifications();
    logger.info("Default data seeded successfully");
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
      return;
    }

    const categories = await getAll<{ id: number; name: string }>("SELECT id, name FROM categories");

    // One office per category
    for (const category of categories) {
      await runQuery(
        `INSERT INTO offices (name, category_id, type) VALUES (?, ?, ?)`,
        [`${category.name} Office`, category.id, "technical"]
      );
    }

    await runQuery(
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


    const roles: { name: string; type: string; office_id: number | null; company_id: number | null }[] = [
      { name: "Citizen", type: "citizen", office_id: null, company_id: null },
      { name: "Municipal_public_relations_officer", type: "pub_relations", office_id: officeMap["Organization Office"]!, company_id: null },
      { name: "Water_utility_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Water Supply"), company_id: null },
      { name: "Sewer_system_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Sewer"), company_id: null },
      { name: "Public_lightning_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Public Lighting"), company_id: null },
      { name: "Architectural_barriers_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Architectural Barriers"), company_id: null },
      { name: "Waste_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Waste"), company_id: null },
      { name: "Road_signs_urban_furnishings_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Roads and Urban Furnishings"), company_id: null },
      { name: "Public_green_areas_playgrounds_officer", type: "tech_officer", office_id: getOfficeIdForCategory("Public Green Areas and Playgrounds"), company_id: null },
      { name: "Admin", type: "admin", office_id: officeMap["Organization Office"]!, company_id: null },
      { name: "Perry Worker", type: "external_maintainer", office_id: null, company_id: 1 },
      { name: "BarrierFix Worker", type: "external_maintainer", office_id: null, company_id: 2 },
      { name: "SewerFlow Worker", type: "external_maintainer", office_id: null, company_id: 3 },
      { name: "Enel Worker", type: "external_maintainer", office_id: null, company_id: 4 },
      { name: "EcoWaste Worker", type: "external_maintainer", office_id: null, company_id: 5 },
      { name: "TrafficTech Worker", type: "external_maintainer", office_id: null, company_id: 6 },
      { name: "Apex Worker", type: "external_maintainer", office_id: null, company_id: 7 },
      { name: "Clean Roads Worker", type: "external_maintainer", office_id: null, company_id: 8 },
      { name: "GreenCare Worker", type: "external_maintainer", office_id: null, company_id: 9 },
      { name: "GeneralWorks Worker", type: "external_maintainer", office_id: null, company_id: 10 },
      { name: "FixRoads Worker", type: "external_maintainer", office_id: null, company_id: 7 },
    ];


    for (const role of roles) {
      const existing = await getOne<{ id: number }>("SELECT id FROM roles WHERE name = ?", [role.name]);
      if (!existing) {
        await runQuery(
          `INSERT INTO roles (name, type, office_id, company_id) VALUES (?, ?, ?, ?)`,
          [role.name, role.type, role.office_id, role.company_id]
        );
      }
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed roles and offices");
  }
};


/**
 * Seed default users
 */
export const seedDefaultUsers = async (): Promise<void> => {
  try {
    // --------------------------------------------------
    // Load roles
    // --------------------------------------------------
    const roles = await getAll<{ id: number; name: string }>(
      "SELECT id, name FROM roles"
    );

    const roleMap: Record<string, number> = {};
    for (const role of roles) {
      roleMap[role.name] = role.id;
    }

    // --------------------------------------------------
    // Users to seed
    // --------------------------------------------------
    const users: Array<{
      firebase_uid: string;
      email: string;
      username: string;
      first_name: string;
      last_name: string;
      roles: string[];
    }> = [
        {
          firebase_uid: "QBUqptp5sYa46a2ALU3t8QXRIHz2",
          email: "citizen@example.com",
          username: "JohnDoe",
          first_name: "John",
          last_name: "Doe",
          roles: ["Citizen"]
        }, {
          firebase_uid: "CV0ZG2bmDva06EHVdSwcF4rz18F3",
          email: "admin@example.com",
          username: "EmilyCarter",
          first_name: "Emily",
          last_name: "Carter",
          roles: ["Admin"]
        },
        {
          firebase_uid: "QF6qat0SyJcdX91zZINZLaTakM12",
          email: "operator@example.com",
          username: "JaneSmith",
          first_name: "Jane",
          last_name: "Smith",
          roles: ["Municipal_public_relations_officer"]
        },
        {
          firebase_uid: "Qyo5a7u15JcU2E6z7yaOgwMvYKy2",
          email: "pub-relations@example.com",
          username: "pub-relations",
          first_name: "Daniel",
          last_name: "Hartman",
          roles: ["Municipal_public_relations_officer"]
        },
        {
          firebase_uid: "8tgYd6X1zfVYOIJUNOIDonFwUTx2",
          email: "operator-sewer@example.com",
          username: "operator-sewer",
          first_name: "Lena",
          last_name: "Alvarez",
          roles: ["Sewer_system_officer"]
        },
        {
          firebase_uid: "jm7oNq1RdYMjOA1S23VJopQYVrR2",
          email: "operator-water@example.com",
          username: "operator-water",
          first_name: "Ethan",
          last_name: "Caldwell",
          roles: ["Water_utility_officer"]
        },
        {
          firebase_uid: "iT18eWAsjgQ0SBD8isKIFRBG1UD3",
          email: "operator-architectural@example.com",
          username: "operator-architectural",
          first_name: "Gigi",
          last_name: "Proietti",
          roles: ["Architectural_barriers_officer"]
        },
        {
          firebase_uid: "kv63cdFLJXZfSXsaVVcVM3BDzog1",
          email: "operator-lightning@example.com",
          username: "operator-lightning",
          first_name: "Max",
          last_name: "Casper",
          roles: ["Public_lightning_officer"]
        },
        {
          firebase_uid: "CVvUKpF0zthFliHMgBmuOe9HtGA2",
          email: "operator-waste@example.com",
          username: "operator-waste",
          first_name: "Joe",
          last_name: "Simpson",
          roles: ["Waste_officer"]
        },
        {
          firebase_uid: "hrLE2NDZsSaGdVWpzuAsroYrGwF3",
          email: "operator-urban@example.com",
          username: "operator-urban",
          first_name: "Lewis",
          last_name: "Hamilton",
          roles: ["Road_signs_urban_furnishings_officer", "Architectural_barriers_officer"]
        },
        {
          firebase_uid: "vPCfQ4wQoANVEwn7b6U5OFFeAGA2",
          email: "operator-green@example.com",
          username: "operator-green",
          first_name: "Pablo",
          last_name: "Jullones",
          roles: ["Public_green_areas_playgrounds_officer"]
        },
        {
          firebase_uid: "PdzfTCrdM0SBkEPM4rtqgi1exEJ2",
          email: "water-worker@example.com",
          username: "PerryPlumber",
          first_name: "Perry",
          last_name: "Platapus",
          roles: ["Perry Worker"]
        },
        {
          firebase_uid: "GlPacXZgUBSp83zGzBxkFgmoVmq1",
          email: "apex-worker@example.com",
          username: "CarlosSainz",
          first_name: "Carlos",
          last_name: "Sainz",
          roles: ["Apex Worker"]
        },
        {
          firebase_uid: "nZNdQ4nTose57ldQ5QfQ82GmlSg2",
          email: "barrier-worker@example.com",
          username: "StephenKing",
          first_name: "Stephen",
          last_name: "King",
          roles: ["BarrierFix Worker"]
        },
        {
          firebase_uid: "VNkBGMLx05QWhgJVSG4Iazct54t1",
          email: "sewer-worker@example.com",
          username: "JosephCricket",
          first_name: "Joseph",
          last_name: "Cricket",
          roles: ["SewerFlow Worker"]
        },
        {
          firebase_uid: "jnRaXpgX0TNJHv0Ejd7vTjnM7NI2",
          email: "enel-worker@example.com",
          username: "GabeNewell",
          first_name: "Gabe",
          last_name: "Newell",
          roles: ["Enel Worker"]
        },
        {
          firebase_uid: "6u05OsQj1cgSEtXk37Woql3oo1h2",
          email: "eco-worker@example.com",
          username: "AlbertMug",
          first_name: "Albert",
          last_name: "Mug",
          roles: ["EcoWaste Worker"]
        },
        {
          firebase_uid: "xaYgBHJ9xXbipabyXKumonKugaR2",
          email: "traffic-worker@example.com",
          username: "MatthewSalvidor",
          first_name: "Matthew",
          last_name: "Salvidor",
          roles: ["TrafficTech Worker"]
        },
        {
          firebase_uid: "q45Hc2wZYYXW9v66j7f8Dpxe28A2",
          email: "clean-worker@example.com",
          username: "BenedictCumberbatch",
          first_name: "Benedict",
          last_name: "Cumberbatch",
          roles: ["Clean Roads Worker"]
        },
        {
          firebase_uid: "2tWT4MFii2SS93eJOanNV4FRMkW2",
          email: "green-worker@example.com",
          username: "MichaelAlexander",
          first_name: "Michael",
          last_name: "Alexander",
          roles: ["GreenCare Worker"]
        },
        {
          firebase_uid: "JOU5ucK2zDULRX5tSGXyzuHSxEu1",
          email: "general-worker@example.com",
          username: "PalemaAnderson",
          first_name: "Palema",
          last_name: "Anderson",
          roles: ["GeneralWorks Worker"]
        },
        {
          firebase_uid: "PQEn35izxmQh7T1a15hCujoxlyr2",
          email: "rosabianca@example.com",
          username: "RosaBianca",
          first_name: "Rosa",
          last_name: "Bianca",
          roles: ["Citizen"]
        },
        {
          firebase_uid: "lJKo4fkjvQbjQBzs4xSu01EUQmU2",
          email: "mimmoschillaci@municipal.it",
          username: "Mimmo Schillaci",
          first_name: "Mimmo",
          last_name: "Schillaci",
          roles: ["Municipal_public_relations_officer"]
        },
        {
          firebase_uid: "4qvUQ4PnNPdHjqspu3WLl9QO5hj2",
          email: "adalovelace@municipal.it",
          username: "Ada Lovelace",
          first_name: "Ada",
          last_name: "Lovelace",
          roles: ["Road_signs_urban_furnishings_officer"]
        },
        {
          firebase_uid: "X4VF5e2o5yUEBGpxZSYCTfuC87j1",
          email: "adalovelace@municipal.it",
          username: "Ada Lovelace",
          first_name: "Ada",
          last_name: "Lovelace",
          roles: ["Road_signs_urban_furnishings_officer"]
        },
        {
          firebase_uid: "xZz3u5pRCjMbtAVMcQQXqbDbLR13",
          email: "mariorossi@fixroads.it",
          username: "Mario Rossi",
          first_name: "Mario",
          last_name: "Rossi",
          roles: ["FixRoads Worker"]
        }
      ];

    // --------------------------------------------------
    // Insert users and assign roles
    // --------------------------------------------------
    for (const user of users) {
      // Ensure user exists
      let dbUser = await getOne<{ id: number }>(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );

      if (!dbUser) {
        await runQuery(
          `INSERT INTO users (firebase_uid, email, username, first_name, last_name)
           VALUES (?, ?, ?, ?, ?)`,
          [
            user.firebase_uid,
            user.email,
            user.username,
            user.first_name,
            user.last_name
          ]
        );

        // Re-fetch user id (TS-safe, DB-safe)
        dbUser = await getOne<{ id: number }>(
          "SELECT id FROM users WHERE email = ?",
          [user.email]
        );
      }

      if (!dbUser) {
        logger.error(`Failed to create user: ${user.email}`);
        continue;
      }

      const userId = dbUser.id;

      // Assign roles

      for (const element of user.roles) {
        const roleName = element;

        if (!(roleName in roleMap)) {
          logger.warn(`Role not found: ${roleName}`);
          continue;
        }

        const roleId = roleMap[roleName] as number;

        await runQuery(
          `INSERT OR IGNORE INTO user_roles (user_id, role_id)
           VALUES (?, ?)`,
          [userId, roleId]
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
      return;
    }

    const users = await getAll<{ id: number; username: string }>("SELECT id, username FROM users");
    const categories = await getAll<{ id: number; name: string }>("SELECT id, name FROM categories");

    if (!users.length || !categories.length) {
      logger.warn("Cannot seed reports: no users or categories found");
      return;
    }

    // Use first user and category as fallback
    const firstUser = users.find(u => u.username === "JohnDoe") ?? users[0] ?? { id: 1, username: "JohnDoe" };
    const secondUser = users.find(u => u.username === "RosaBianca") ?? users[1] ?? { id: 2, username: "RosaBianca" };
    const firstCategory = categories[0] ?? { id: 1 };

    const reports = [
      /********************************
       * REAL REPORT*
       ********************************/
      {
        title: "Neglected street corner",
        description: "This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        address: "Via Paolo Sacchi 11, 10125 Torino",
        position_lat: 45.0608,
        position_lng: 7.67613,
        status: "pending_approval"
      },
      {
        title: "Fallen Road Sign",
        description: "A road sign has fallen and requires prompt repair.",
        user_id: secondUser.id,
        category_id: categories.find(c => c.name.includes("Road Signs and Traffic Lights"))?.id ?? firstCategory.id,
        address: "Piazza Giambattista Bodoni 1, 10123 Torino",
        position_lat: 45.0632,
        position_lng: 7.6835,
        status: "pending_approval"
      },
      {
        title: "Damaged Bollard",
        description: "A bollard was cracked in an accident and needs repair",
        user_id: secondUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        address: "Corso Stati Uniti 65, 10129 Torino",
        position_lat: 45.06555,
        position_lng: 7.66233,
        status: "assigned",
        reviewed_by: 3,
        assigned_to: 10,
        external_user: 13
      },
      {
        title: "Wooden Bench with Missing Boards",
        description: "A wooden bench has several missing boards and requires maintenance.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        address: "Corso Stati Uniti 67, 10129 Torino",
        position_lat: 45.06564,
        position_lng: 7.66166,
        status: "in_progress",
        reviewed_by: 3,
        assigned_to: 10
      },
      {
        title: "Accessibility barrier",
        description: "This damaged and uneven sidewalk surface represents an accessibility barrier, especially for people using wheelchairs, walkers, strollers, or those with limited mobility.",
        user_id: firstUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        address: "Corso Stati Uniti 55, 10129 Torino",
        position_lat: 45.06504,
        position_lng: 7.66376,
        status: "suspended",
        reviewed_by: 3,
        assigned_to: 10
      },
      {
        title: "Damaged Road, Hazard for Vehicles",
        description: "This road surface in poor condition, with several cracks, uneven patches, and worn asphalt. These defects can pose challenges for vehicles, as they may cause instability, discomfort, or even damage to tires and suspension systems.",
        user_id: secondUser.id,
        category_id: categories.find(c => c.name.includes("Roads and Urban Furnishings"))?.id ?? firstCategory.id,
        address: "Corso Galileo Ferraris 49h, 10129 Torino",
        position_lat: 45.06297,
        position_lng: 7.66937,
        status: "resolved",
        reviewed_by: 3,
        assigned_to: 24,
      },
      {
        title: "Abandoned Pole",
        description: "An abandoned pole in the green areas",
        user_id: secondUser.id,
        category_id: 8,
        address: "Corso Trieste 7a, 10129 Torino",
        position_lat: 45.06222,
        position_lng: 7.66694,
        status: "rejected",
        reviewed_by: null,
        assigned_to: null,
      },
      // THE REST ARE GENERATED
      {
        title: "Water supply assigned",
        description: "Assigned to a technician for water supply issue.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        address: "Piazza Corpus Domini 17f, 10129 Torino",
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
        address: "Via Accademia Albertina 23c, 10129 Torino",
        position_lat: 45.0619,
        position_lng: 7.686,
        status: "in_progress",
        reviewed_by: 3,
        assigned_to: 6
      },
      {
        title: "Water supply suspended",
        description: "Water supply work has been suspended temporarily.",
        user_id: users[1]?.id ?? firstUser.id,
        category_id: categories.find(c => c.name.includes("Water Supply"))?.id ?? firstCategory.id,
        address: "Corso Verona 10, 10129 Torino",
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
        address: "Via Giovanni Giolitti 5d, 10129 Torino",
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
        address: "Lungo Dora Savona Giardino Gilardi, 10129 Torino",
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
          `INSERT INTO reports 
    (title, description, user_id, category_id, address, position_lat, position_lng, status, note, assigned_to, reviewed_by, external_user)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            report.title,
            report.description,
            report.user_id,
            report.category_id,
            report.address,
            report.position_lat,
            report.position_lng,
            report.status,
            report.note ?? null,
            report.assigned_to ?? null,
            report.reviewed_by ?? null,
            report.external_user ?? null
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
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764345101/Participium/rei7xyxueyvtz031ved9.jpg",
        ordering: 1
      },
      {
        report_id: 5,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764345066/Participium/e3x1elvzx0fsyal9som1.jpg",
        ordering: 2
      },
      {
        report_id: 6,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764345440/Participium/ctndw8ykaoubibuqnmud.jpg",
        ordering: 1
      },
      {
        report_id: 7,
        url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764345798/Participium/qx8fszwxuorrzre7qkoo.jpg",
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

/**
 * Seed default company
 */
export const seedDefaultCompanies = async (): Promise<void> => {
  try {
    // Check if any companies exist
    const companyCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM companies");

    if (!companyCount || companyCount.count === 0) {

      const defaultCompanies = [
        { name: "Perry's Plumbers", category_id: 1 },         // Water Supply – Drinking Water
        { name: "BarrierFix Solutions", category_id: 2 },     // Architectural Barriers
        { name: "SewerFlow Services", category_id: 3 },       // Sewer System
        { name: "Enel", category_id: 4 },                     // Public Lighting
        { name: "EcoWaste Management", category_id: 5 },      // Waste
        { name: "TrafficTech Signs", category_id: 6 },        // Road Signs and Traffic Lights
        { name: "Apex Corp", category_id: 7 },                // Roads and Urban Furnishings
        { name: "Clean Roads", category_id: 7 },              // Roads and Urban Furnishings
        { name: "GreenCare Parks", category_id: 8 },          // Public Green Areas and Playgrounds
        { name: "GeneralWorks Co.", category_id: 9 },         // Other
        { name: "FixRoads Srl", category_id: 7 },
      ];


      for (const company of defaultCompanies) {
        await runQuery(
          `INSERT INTO companies (name, category_id) VALUES (?, ?)`,
          [company.name, company.category_id]
        );
      }
    } else {
      logger.info("Companies already exist, skipping seeding");
    }
  } catch (error) {
    logger.error({ error }, "Failed to seed default companies");
  }
};

/**
 * Seed default comments
 */
export const seedDefaultComments = async (): Promise<void> => {
  try {
    // Check if any comments already exist
    const commentCount = await getOne<{ count: number }>("SELECT COUNT(*) as count FROM comments");
    if (commentCount?.count && commentCount.count > 0) {
      return;
    }

    const comments = [
      {
        report_id: 3,
        user_id: 1,
        type: "public",
        text: "Can we have an expected completion date for the maintenance?"
      },
      {
        report_id: 3,
        user_id: 10,
        type: "private",
        text: "This should be repaired in two days."
      },
      {
        report_id: 4,
        user_id: 10,
        type: "private",
        text: "The municipality ask to also repaint the bench."
      },
      {
        report_id: 3,
        user_id: 14,
        type: "private",
        text: "Ok, I will inform my team."
      }
    ];

    for (const comment of comments) {
      await runQuery(
        `INSERT INTO comments (report_id, user_id, type, text) VALUES (?, ?, ?, ?)`,
        [comment.report_id, comment.user_id, comment.type, comment.text]
      );
    }

  } catch (error) {
    console.error("Failed to seed default comments", error);
  }
};

/**
 * Seed default notifications (for E2E tests)
 */
export const seedDefaultNotifications = async (): Promise<void> => {
  try {
    const notifications = [
      {
        id: 1,
        user_id: 1,
        type: "status_update",
        report_id: 1,
        comment_id: null,
        title: "Report status updated",
        message: "Your report status has been updated",
        is_read: 0,
      },
      {
        id: 2,
        user_id: 10,
        type: "status_update",
        report_id: 3,
        comment_id: null,
        title: "Report assigned",
        message: "A report has been assigned to you",
        is_read: 0,
      },
    ];

    for (const notification of notifications) {
      const existing = await getOne<{ id: number }>(
        "SELECT id FROM notifications WHERE id = ?",
        [notification.id]
      );

      if (!existing) {
        await runQuery(
          `
          INSERT INTO notifications
          (id, user_id, type, report_id, comment_id, title, message, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            notification.id,
            notification.user_id,
            notification.type,
            notification.report_id,
            notification.comment_id,
            notification.title,
            notification.message,
            notification.is_read,
          ]
        );
      }
    }

    logger.info("Default notifications seeded successfully");
  } catch (error) {
    logger.error({ error }, "Failed to seed default notifications");
  }
};




export default initializeDatabase;
