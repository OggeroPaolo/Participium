# Database

This directory contains database-related files for the Participium project.

## Files

- `init.ts` - Database initialization logic
- `schema.sql` - Complete database schema definition with all tables, indexes, and triggers

## Database Structure

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│       users          │         │       roles          │
├──────────────────────┤         ├──────────────────────┤
│ • id (PK)            │         │ • id (PK)            │
│ • firebase_uid       │         │ • name (unique)      │
│ • email (unique)     │         │ • created_at         │
│ • username (unique)  │         └──────────────────────┘
│ • first_name         │                   ▲
│ • last_name          │                   │
│ • role_id (FK)       │───────────────────┘
│ • profile_photo_url  │         (one-to-many)
│ • telegram_username  │
│ • email_notif...     │
│ • is_active          │
│ • created_at         │
│ • updated_at         │ ◄────┐
│ • last_login_at      │ ◄──┐ │
└──────────────────────┘    | │
                            │ │ (many-to-one)
┌──────────────────────┐    │ │                   ┌──────────────────────┐
|     reports          |    │ │                   |       photos         |
├──────────────────────┤    │ │                   ├──────────────────────┤
| • id (PK)            |    │ │                   | • id (PK)            |
| • user_id (FK)       |────┘ │                ┌──| • report_id (FK)     |
| • reviewed_by (FK)   |──────┘                │  | • url                |
| • title              | ◄─────────────────────┘  | • ordering           |
| • category_id(FK)    |────────────────┐         └──────────────────────┘
| • description        |                │
| • status             |                │
| • note               |                │
| • position_lat       |                │
| • position_lng       |                |
| • reviewed_at        |                │ (many-to-one)
| • created_at         |                │
| • updated_at         |                │
└──────────────────────┘                │
                                        │
                                        ▼
┌──────────────────────┐         ┌──────────────────────────────┐
│     offices          │         │        categories            │
├──────────────────────┤         ├──────────────────────────────┤
│ • id (PK)            │◄────────┤ • id (PK)                    │
│ • name               │         │ • name (unique)              │
│ • type (org/tech)    │         │ • description                │
│ • email              │         │ • default_technical_office_id│
│ • phone              │         │   (FK → offices.id)          │
│ • created_at         │         │ • is_active                  │
│ • updated_at         │         │ • created_at                 │
└──────────────────────┘         │ • updated_at                 │
         ▲                       └──────────────────────────────┘
         │                                  ▲
         │        ┌─────────────────┐       │
         └────────┤ category_offices│───────┘
                  │   (junction)    │
                  ├─────────────────┤
                  │ • category_id   │
                  │   (PK, FK)      │
                  │ • office_id     │
                  │   (PK, FK)      │
                  │ • assigned_at   │
                  └─────────────────┘
```
### Core Tables

#### users
Stores user account information including Firebase authentication, profile data, and preferences.
- **Key Fields**: firebase_uid (unique), email (unique), username (unique)
- **Foreign Keys**: role_id → roles.id (one user has one role)
- **Optional**: telegram_username, profile_photo_url
- **Settings**: email_notifications_enabled, is_active
- **Timestamps**: created_at, updated_at, last_login_at
- **Note**: Uses Firebase Authentication, no password stored locally

#### roles
Predefined user roles for access control:
- `citizen` - Regular users who can submit reports
- `org_office_operator` - Organization office staff (approval)
- `technical_office_operator` - Technical office staff (execution)
- `admin` - System administrators

#### offices
Physical or organizational offices that handle reports:
- **Types**: 
  - `organization` - Approval offices
  - `technical` - Execution offices
- **Contact**: email, phone
- **Timestamps**: created_at, updated_at

#### categories
Report categories with default routing:
- Predefined categories like "Water Supply", "Public Lighting", etc.
- Each category can have a default_technical_office_id for automatic routing
- **Settings**: is_active (to enable/disable categories)

#### category_offices (Junction Table)
Many-to-many relationship between categories and offices.
- Defines which offices can handle which categories
- Composite primary key: (category_id, office_id)

#### reports
Stores user-submitted reports for issues, tracking their status and review process
- **Foreign Keys**: user_id (FK -> users.id), reviewed_by (FK -> users.id). category_id (FK -> categories.id)
- **Main fields**: title, description (report content)
- **Status**:
- `pending`  - Not yet reviewed
- `accepted` - Accepted by an officer (note field null)
- `rejected` - Rejected by an officer (note filed becomes mandatory)
- **Geographical location**: position_lat, position_lng
- **Relationships**: Each report is created by a single user and may be reviewed by a municipal public relations officer
- **Timestamps**: created_at, updated_at, reviewed_at

#### photos
Stores 1 to 3 photos associated with each report, maintaining order and links to the report.
- **Foreign Keys**: report_id(FK -> reports.id)
- **Relationships**: Each photo belongs exactly to one report.

## Relationships

```
users → roles (one-to-many)
  Each user has ONE role
  A role can be assigned to MANY users

users → reports (one-to-many) (via user_id)
  Each report is created by ONE user
  Each user can create MANY reports

users (officers) → reports (one to many) (via reviewed_by)
  Each report can be reviewed by ONE officer (optional)
  Each officer can review MANY reports

reports → categories (many-to-one)
  Each report belongs to ONE category
  Each category can have MANY reports

categories ←→ offices (via category_offices)
  Many categories can be handled by many offices
  
categories → offices (default_technical_office_id)
  Each category has one default technical office
```

## Initialization Process

1. **Schema Creation**: The `schema.sql` file is executed to create all tables, indexes, and triggers
2. **Default Data Seeding**:
   - Roles: citizen, org_office_operator, technical_office_operator, admin
   - Categories: 9 predefined categories for issue reporting

## Database Features

### Automatic Timestamps
- `updated_at` fields are automatically updated via triggers
- `created_at` fields use `CURRENT_TIMESTAMP` as default

### Indexes
Optimized for common queries:
- User lookups by email/username/firebase_uid
- Role-based queries (users by role)
- Active categories/users filtering
- Category-office relationships

### Foreign Key Constraints
- **users → roles**: RESTRICT on delete (prevents deleting a role with active users)
- **categories → offices**: SET NULL on delete (optional default office)
- **reports → users** RESTRICT on delete (prevents deleting a user with reports or that has reviewed a report)
- **reports → categories** RESTRICT on delete (prevents deleting a category with reports)
- **photos → reports** CASCADE on delete (removes photos if the parent report is deleted)
- **Junction tables**: CASCADE on delete (removes associations when parent is deleted)
- Ensures referential integrity

## Pre-defined Database Promises

Available in `config/database.ts`:
- `getDatabase()` - Get singleton database instance
- `runQuery(sql, params)` - Execute INSERT/UPDATE/DELETE
- `getOne(sql, params)` - Fetch single row
- `getAll(sql, params)` - Fetch multiple rows
- `execSQL(sql)` - Execute raw SQL (for schema)
- `closeDatabase()` - Close database connection



## Notes

- SQLite uses INTEGER for boolean values (1 = true, 0 = false)
- All tables have proper indexes for optimal query performance
- Foreign keys are enabled by default
- The database file location is configured via `DB_PATH` environment variable
