# Database

This directory contains database-related files for the Participium project.

## Files

- `init.ts` - Database initialization logic
- `schema.sql` - Complete database schema definition with all tables, indexes, and triggers

## Database Structure

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│       users          │         │       roles          │
├──────────────────────┤         ├──────────────────────┤
│ • id (PK)            │         │ • id (PK)            │
│ • email (unique)     │         │ • name (unique)      │
│ • username (unique)  │◄───┐    │ • created_at         │
│ • first_name         │    │    └──────────────────────┘
│ • last_name          │    │              ▲
│ • password_hash      │    │              │
│ • profile_photo_url  │    │    ┌─────────┴────────┐
│ • telegram_username  │    │    │   user_roles     │
│ • email_notif...     │    └────┤   (junction)     │
│ • is_active          │         ├──────────────────┤
│ • created_at         │         │ • user_id (PK,FK)│
│ • updated_at         │         │ • role_id (PK,FK)│
│ • last_login_at      │         │ • assigned_at    │
└──────────────────────┘         └──────────────────┘

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
         │        ┌────────────────┐        │
         └────────┤ category_offices│────────┘
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
Stores user account information including credentials, profile data, and preferences.
- **Key Fields**: email (unique), username (unique), password_hash
- **Optional**: telegram_username, profile_photo_url
- **Settings**: email_notifications_enabled, is_active
- **Timestamps**: created_at, updated_at, last_login_at

#### roles
Predefined user roles for access control:
- `citizen` - Regular users who can submit reports
- `org_office_operator` - Organization office staff (approval)
- `technical_office_operator` - Technical office staff (execution)
- `admin` - System administrators

#### user_roles (Junction Table)
Many-to-many relationship between users and roles.
- A user can have multiple roles
- Composite primary key: (user_id, role_id)

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

## Relationships

```
users ←→ roles (via user_roles)
  Many users can have many roles

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
- User lookups by email/username
- Role-based queries
- Active categories/users filtering
- Category-office relationships

### Foreign Key Constraints
- CASCADE on delete for junction tables
- SET NULL for optional foreign keys
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
