# Participium Backend

Backend API for the Participium project.

## Getting Started

### Important Documentation

please check config/database.ts for pre-defined database promises
- 🔧 **[src/config/database.ts](./src/config/database.ts)** - 

please read readme file at ./db/README.md for better understanding of db initalization


### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
DB_PATH=./data/participium.db  # Optional, defaults to this path
LOG_LEVEL=info  # Optional
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## Database

The project uses **SQLite** with the following structure:

### Tables
- **users** - User accounts and authentication
- **roles** - User roles (citizen, operators, admin)
- **user_roles** - User-role assignments (many-to-many)
- **offices** - Organization and technical offices
- **categories** - Issue report categories
- **category_offices** - Category-office assignments (many-to-many)

### Default Data
The database is automatically seeded with:
- 4 roles: citizen, org_office_operator, technical_office_operator, admin
- 9 categories: Water Supply, Architectural Barriers, Sewer System, etc.


## API Endpoints

### Health Check

- **GET** `/health` - Returns the health status of the server

### Operators

**GET `/operators`**

- **Request Parameters:** None

- **Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "username": "adminUser",
    "first_name": "John",
    "last_name": "Doe",
    "profile_photo_url": "https://example.com/photos/john_doe.jpg",
    "role_name": "Admin",
    "created_at": "2025-11-06T10:15:32"
  },
  {
    "id": 2,
    "email": "operator@example.com",
    "username": "operatorUser",
    "first_name": "Jane",
    "last_name": "Smith",
    "profile_photo_url": "https://example.com/photos/jane_smith.jpg",
    "role_name": "Operator",
    "created_at": "2025-10-30T09:12:45"
  }
]
```

- **No Content Response (204 No Content):**
```json
// Empty response body
```

- **Error Response (401 Unauthorized):**
Returned when no valid authentication token is provided.
```json
{
  "error": "Unauthorized: missing or invalid token"
}
```

- **Error Response (403 Forbidden):**
Returned when the authenticated user is not an admin.
```json
{
  "error": "Forbidden: admin access required"
}
```

- **Error Response (500 Internal Server Error):**
```json
{
  "error": "Database connection failed"
}
```
```json
{
  "error": "Failed to retrieve operators"
}

### Registration

**POST `/user-registrations`**

- **Request Parameters:** None

- **Request Body content:**
```json
{
  "firebaseUid": "XPbEc2V01QhOQm6YRNlYNo57aQl1",
  "firstName": "Mario",
  "lastName": "Rossi",
  "username": "SuperMario",
  "email": "mario.rossi@gmail.com"
}
```

- **Success Response (201 Created):**
```json
{
  "message": "User data saved successfully",
  "userId": "XPbEc2V01QhOQm6YRNlYNo57aQl1"
}
```
- **Error Response (500 Internal Server Error):**
```json
{
  "error": "Internal server error"
}
```
- **Error Response (400 Bad Request):**
```json
{
  "error": "Invalid request data"
}
```
- **Error Response (409 Conflict):**
```json
{
  "error": "User already registered"
}
```
- **Error Response (422 Unprocessable Entity):**
```json
{
  "error": "Email or username already in use"
}
```

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server entry point
├── config/             # Configuration files
│   ├── env.ts          # Environment variable validation
│   ├── logger.ts       # Logging configuration
│   └── database.ts     # Database connection
├── db/                 # Database related files
│   ├── init.ts         # Database initialization
│   └── schema.sql      # Database schema
├── middlewares/        # Express middlewares
│   └── error.ts        # Error handling middleware
├── routes/             # API routes
│   ├── index.ts        # Main router
│   └── health.routes.ts # Health check routes
└── dao/                # Data Access Objects
```
