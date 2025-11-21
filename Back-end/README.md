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
- **users** - User accounts with Firebase authentication (includes role_id)
- **roles** - User roles (citizen, operators, admin)
- **offices** - Organization and technical offices
- **categories** - Issue report categories
- **category_offices** - Category-office assignments (many-to-many)

### Default Data
The database is automatically seeded with:
- 3 role types: citizen, operator, admin
- 9 categories: Water Supply, Architectural Barriers, Sewer System, etc.


## API Endpoints

### Health Check

- **GET** `/health` - Returns the health status of the server

### Roles

**GET `/roles`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** None

* **Success Response (200 OK):**

```json
[
  {
    "id": 2,
    "name": "Roads_Maintenance_Office_Staff",
    "type": "tech_officer",
    "created_at": "2025-11-08 11:46:55"
  },
  {
    "id": 3,
    "name": "Water_Utility_Office_Staff",
    "type": "tech_officer",
    "created_at": "2025-11-08 11:46:55"
  }
]
```

* **No Content Response (204 No Content):**

```json
// Empty response body
```

* **Error Response (401 Unauthorized):**
  Returned when no valid authentication token is provided.

```json
{
  "error": "Unauthorized: missing or invalid token"
}
```

* **Error Response (403 Forbidden):**
  Returned when the authenticated user is not an admin.

```json
{
  "error": "Forbidden: insufficient permissions"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Database connection failed"
}
```

```json
{
  "error": "Failed to retrieve roles"
}
```

### Registration

**POST `/user-registrations`**

- **Request Parameters:** None

- **Request Body content:**
```json
{
  "firstName": "Mario",
  "lastName": "Rossi",
  "username": "SuperMario",
  "email": "mario.rossi@gmail.com",
  "password": "passwordincredibile"
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

### Operators

**GET `/operators`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```

- **Request Parameters:** None

- **Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "firebase_uid": "uid_operator1",
    "email": "operator1@example.com",
    "username": "operator_user1",
    "first_name": "John",
    "last_name": "Amber",
    "role_name": "Water_Utility_Office_Staff",
    "profile_photo_url": null,
    "telegram_username": null,
    "email_notifications_enabled": 1,
    "is_active": 1,
    "created_at": "2025-11-08 11:46:55",
    "updated_at": "2025-11-08 11:46:55",
    "last_login_at": null
  },
  {
    "id": 2,
    "firebase_uid": "uid_operator2",
    "email": "operator2@example.com",
    "username": "operator_user2",
    "first_name": "Jane",
    "last_name": "Smith",
    "role_name": "Water_Utility_Office_Staff",
    "profile_photo_url": null,
    "telegram_username": null,
    "email_notifications_enabled": 1,
    "is_active": 1,
    "created_at": "2025-11-08 11:46:55",
    "updated_at": "2025-11-08 11:46:55",
    "last_login_at": null
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
  "error": "Forbidden: insufficient permissions"
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
```

**POST `/operator-registrations`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** None

* **Request Body:**

```json
{
  "firstName": "Mario",
  "lastName": "Rossi",
  "username": "SuperMario",
  "email": "mario.rossi@gmail.com",
  "password": "securePassword123",
  "role_id": 2
}
```

* **Success Response (201 Created):**
```json
{
  "message": "Operator created successfully",
  "userId": "XPbEc2V01QhOQm6YRNlYNo57aQl1"
}
```

* **Error Response (400 Bad Request):**
```json
{
  "error": "Invalid request data"
}
```

* **Error Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized: missing or invalid token"
}
```

* **Error Response (403 Forbidden):**
```json
{
  "error": "Forbidden: insufficient permissions"
}
```

* **Error Response (409 Conflict):**
```json
{
  "error": "User already registered"
}
```

* **Error Response (422 Unprocessable Entity):**
```json
{
  "error": "Invalid role data, cannot assign admin or citizen"
}
```

```json
{
  "error": "Email or username already in use"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server error"
}
```

**PATCH `/reports/{reportId}`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:**

  - reportId: integer

* **Request Body:**

```json
{
  "status": "rejected",
  "note": "Insufficient details",
  "categoryId": 3
}
```

* **Field Usage Notes:**

| Field      | When Required                        | Types                    |
| ---------- | ------------------------------------ | ------------------------ |
| status     | Always required                      | ["assigned", "rejected"] |
| note       | Required when `status` is `rejected` | string                   |
| categoryId | Optional                             | integer                  |

* **Success Response (200 OK):**

```json
{
  "message": "Report status updated successfully"
}
```

* **Error Response (400 Bad Request):**

```json
{
  "errors": "Invalid request data"
}
```

* **Error Response (401 Unauthorized):**
  Returned when no valid authentication token is provided.

```json
{
  "error": "Unauthorized: missing or invalid token"
}
```

* **Error Response (403 Forbidden):**
  Returned when the authenticated user is not a public relations officer.

```json
{
  "error": "Forbidden: insufficient permissions"
}
```

* **Error Response (404 Not Found):**

```json
{
  "error": "Report not found"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server error"
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
