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
│ • firebase_uid       │         │ • name (unique)      │         (many-to-one)
│ • email (unique)     │         │ • office_id (FK)     │────────────────────────┐
│ • username (unique)  │         │ • created_at         │                        │
│ • first_name         │         └──────────────────────┘                        │
│ • last_name          │                   ▲                                     │
│ • role_id (FK)       │                   │                                     │
│ • profile_photo_url  │───────────────────┘                                     │
│ • telegram_username  │         (one-to-many)                                   │
│ • email_notif...     │                                                         │
│ • is_active          │                                                         │
│ • created_at         │ ◄──────┐                                                │
│ • updated_at         │ ◄────┐ │                                                │
│ • last_login_at      │ ◄──┐ │ │                                                │
└──────────────────────┘    | │ │                                                │
                            │ │ │ (many-to-one)                                  │
┌──────────────────────┐    │ │ │                  ┌──────────────────────┐      │
|     reports          |    │ │ │                  |       photos         |      │
├──────────────────────┤    │ │ │                  ├──────────────────────┤      │
| • id (PK)            |    │ │ │                  | • id (PK)            |      │
| • user_id (FK)       |────┘ │ │               ┌──| • report_id (FK)     |      │
| • reviewed_by (FK)   |──────┘ │               │  | • url                |      │
| • assigned_to (FK)   |────────┘               |  | • ordering           |      │
| • title              | ◄──────────────────────┘  └──────────────────────┘      │
| • category_id(FK)    |────────────────────┐                                    │
| • description        |                    │                                    │
| • status             |                    │                                    │
| • note               |                    │                                    │
| • position_lat       |                    │                                    │
| • position_lng       |                    |                                    │
| • reviewed_at        |                    │ (many-to-one)                      │
| • created_at         |                    │                                    │
| • updated_at         |                    │                                    │
| • is_anonymous       |                    │                                    │
└──────────────────────┘                    │                                    │
                                            ▼                                    │
┌──────────────────────┐              ┌──────────────────────────────┐           │
│     offices          │              │        categories            │           │
├──────────────────────┤              ├──────────────────────────────┤           │
│ • id (PK)            │              | • id (PK)                    │           │
│ • name               │              │ • name (unique)              │           │
│ • type (org/tech)    │ (one to one) │ • description                │           │
| • category_id (FK)   |─────────────►│ • is_active                  │           │
│ • email              │              │ • created_at                 |           │
│ • phone              │              │ • updated_at                 │           │
│ • created_at         │              └──────────────────────────────┘           │
│ • updated_at         │ ◄───────────────────────────────────────────────────────┘
└──────────────────────┘              
                                      

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
- `Municipal_public_relations_officer` - Organization office staff (approval)
- `Technical_office_staff_member` - Technical office staff (execution)
- `Water_utility_officer` - Specialized technical staff
- `Sewer_system_officer` - Specialized technical staff
- `admin` - System administrators
- **Foreign Keys**: office_id → offices.id (each role belongs to one office)
- **Note**: Each user has exactly one role, which is linked to a specific office, defining the scope of reports they can manage.

#### offices
Physical or organizational offices that handle reports:
- **Types**: TODO: UPDATE?
  - `organization` - Approval offices
  - `technical` - Execution offices
- **Contact**: email, phone
- **Foreign Keys**: category_id → categories.id (unique)
- **Timestamps**: created_at, updated_at
- **Note**: Each office manages a single category (one-to-one)

#### categories
Report categories with default routing:
- Predefined categories like "Water Supply", "Public Lighting", etc.
- **Settings**: is_active (to enable/disable categories)

#### reports
Stores user-submitted reports for issues, tracking their status and review process
- **Foreign Keys**: user_id (FK -> users.id), reviewed_by (FK -> users.id), assigned_to (FK -> users.id) category_id (FK -> categories.id)
- **Main fields**: title, description (report content), is_anonymous (boolean)
- **Status**:
- `pending_approval`  - The report has been created and is awaiting review by an officer
- `assigned` - The report has been assigned to a specific user for handling.
- `in_progress` - The assigned user is actively working on the report.
- `suspended`  - The handling of the report is temporarily on hold.
- `rejected` - The report has been rejected by an officer; in this case, the note field is mandatory to provide the reason for rejection.
- `resolved` - The report has been successfully addressed and closed
- **Geographical location**: position_lat, position_lng
- **Relationships**: Each report is created by a single user and may be reviewed by a municipal public relations officer; then is associated to a technical office member that will work on it
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

users (technical officers) → reports (one to many) (via assigned_to)
  Each report can be assigned to ONE officer (optional)
  Each officer can be assigned to MANY reports

reports → categories (many-to-one)
  Each report belongs to ONE category
  Each category can have MANY reports
  
officies → categories (one-to-one)
  Each offices has one category and vice versa

officies → roles (one-to-many)
  Each role belongs to ONE office
  Each office can have MANY roles
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
- Category-office relationship
- Photoes lookups by report_id
- Reports lookups by user_id/status/reviewed_by/assigned_to

### Foreign Key Constraints
- **users → roles**: RESTRICT on delete (prevents deleting a role with active users)
- **reports → users** RESTRICT on delete (prevents deleting a user with reports); SET NULL on delete (user that has reviewed a report or that is assigned to a report)
- **reports → categories** RESTRICT on delete (prevents deleting a category with reports)
- **photos → reports** CASCADE on delete (removes photos if the parent report is deleted)

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
