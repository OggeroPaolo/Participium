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

### Reports

**GET `/reports/map`**

* **Request Headers:** None

* **Request Parameters:** None

* **Success Response (200 OK):**
```json
"reports": [
        {
            "id": 1,
            "title": "Problem with street illumination",
            "reporterName": "John Doe",
            "reporterUsername": "johndoee",
            "position": {
                "lat": 45.4642,
                "lng": 9.19
            }
        },
        {
            "id": 2,
            "title": "Holes in the street",
            "reporterName": "Jane Smith",
            "reporterUsername": "janesmithh",
            "position": {
                "lat": 45.465,
                "lng": 9.191
            }
        }
]
```

* **No Content Response (204 No Content):**

```json
// Empty response body
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server Error"
}
```

**GET `/reports/:reportId`**

* **Request Headers:** 
  
```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** reportId

* **Success Response (200 OK):**
```json
        {
            "id": 1,
            "title": "Neglected street corner",
            "description": "This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.",
            "user_id": 1,
            "position_lat": 45.06080,
            "position_lng": 7.67613,
            "status": "pending_approval"
        }
```

* **Error Response (404 Not Found):**
```json
{
  "error": "Report not found"
}
```

* **Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized"
}
```

* **Error Response (403 Forbidden):**.

```json
{
  "error": "Forbidden: insufficient permissions"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server Error"
}
```

**POST `/reports`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** None

* **Request Body:**
```json
{
  "category_id": 2,
  "title": "Broken streetlight",
  "description": "The streetlight near 5th avenue is out for several days.",
  "is_anonymous": false,
  "position_lat": 45.12345,
  "position_lng": 9.12345,
  "photos": [
    "/path"
  ]
}
```  
* **Success Response (201 Created):**

```json
{
  "report": {
        "id": 10,
        "user_id": 1,
        "category_id": 2,
        "title": "\"Broken street light on 5th avenue\"",
        "description": "\"The street light on 5th avenue is broken and needs urgent repair.\"",
        "status": "pending_approval",
        "assigned_to": null,
        "reviewed_by": null,
        "reviewed_at": null,
        "note": null,
        "is_anonymous": false,
        "position_lat": 45.0632,
        "position_lng": 7.6835,
        "created_at": "2025-11-24 18:10:20",
        "updated_at": "2025-11-24 18:10:20",
        "photos": [
            {
                "url": "https://res.cloudinary.com/di9n3y9dd/raw/upload/v1764007820/Participium/izvuzpkmk2yybjfxphwb",
                "ordering": 1
            }
        ]
    }
}
```

* **Error Response (400 Bad Request - Validation errors):**

```json
{
  "errors": [
    { "msg": "title is required", "param": "title", "location": "body" }
  ]
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal Server Error"
}
```

**GET `/reports`**

* **Request Headers:** 
```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** None

* **Query Parameters: (Optional)** 
```
status: pending_approval, assigned, in_progress, suspended, rejected, resolved
```

* **Success Response (200 OK):**
```json
"reports": [
        {
        "id": 10,
        "user_id": 1,
        "category_id": 2,
        "title": "\"Broken street light on 5th avenue\"",
        "description": "\"The street light on 5th avenue is broken and needs urgent repair.\"",
        "status": "pending_approval",
        "assigned_to": null,
        "reviewed_by": null,
        "reviewed_at": null,
        "note": null,
        "is_anonymous": false,
        "position_lat": 45.0632,
        "position_lng": 7.6835,
        "created_at": "2025-11-24 18:10:20",
        "updated_at": "2025-11-24 18:10:20"
    }
]
```

* **No Content Response (204 No Content):**

```json
// Empty response body
```

* **Error Response (400 Bad Request):**
```json
{
  "error": "Invalid status filter: wrong_status"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server Error"
}
```

* **Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized"
}
```



**GET `/officers/:officerId/reports`**

* **Request Headers:** 
```http
Authorization: Bearer <firebase-token>
```

* **Request Parameters:** officerId

* **Success Response (200 OK):**
```json
"reports": [
        {
        "id": 10,
        "user_id": 1,
        "category_id": 2,
        "title": "\"Broken street light on 5th avenue\"",
        "description": "\"The street light on 5th avenue is broken and needs urgent repair.\"",
        "status": "pending_approval",
        "assigned_to": null,
        "reviewed_by": null,
        "reviewed_at": null,
        "note": null,
        "is_anonymous": false,
        "position_lat": 45.0632,
        "position_lng": 7.6835,
        "created_at": "2025-11-24 18:10:20",
        "updated_at": "2025-11-24 18:10:20"
    }
]
```

* **No Content Response (204 No Content):**

```json
// Empty response body
```

* **Error Response (400 Bad Request):**
```json
{
  "error": "officerId must be a valid integer"
}
```

* **Error Response (500 Internal Server Error):**

```json
{
  "error": "Internal server Error"
}
```

* **Error Response (401 Unauthorized):**

```json
{
  "error": "Unauthorized"
}
```

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

## GET `/external-maintainers`

Retrieve a list of **external maintainers**, optionally filtered by `companyId` and/or `categoryId`.

---

* **Request Headers**
```http
Authorization: Bearer <firebase-token>
```

Allowed roles: TECH_OFFICER, PUB_RELATIONS, ADMIN

---

**Query Parameters (Optional)**
- companyId 
- categoryId 
Example: `/external-maintainers?companyId=3&categoryId=2`

---

### Success Response (200 OK)
```json
{
  "id": 12,
  "fullName": "Alice Brown",
  "username": "ext_maintainer1",
  "email": "maintainer@example.com",
  "roleName": "External Maintainer",
  "roleType": "external_maintainer",
  "companyId": 3,
  "companyName": "HydroTech Ltd"
}
```
### No Content Response (204 No Content)
```json
// empty response
```
###  Error Response (400 Bad Request)
```json
{
  "errors": [
    "CompanyId must be a positive integer",
    "CategoryId must be a positive integer"
  ]
}
```
### Error Response (401 Unauthorized):
```json
{
  "error": "Unauthorized: missing or invalid token"
}
```

### Error Response (403 Forbidden):
```json
{
  "error": "Forbidden: insufficient permissions"
}
```
### Error Response (500 Internal Server Error):

```json
{
  "error": "Internal server error"
}
```
---
### Reports
**PATCH `/tech_officer/reports/{reportId}/assign_external`**

* **Request Headers:**

```http
Authorization: Bearer <firebase-token>
```
* **Request Parameters:**

  - reportId: integer

* **Request Body:**

```json
{
  "externalMaintainerId": "4"
}
```

* **Success Response (200 OK):**

```json
{
  "message": "Report successfully assigned to the external maintainer"
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
  Returned when the authenticated user is not a tech officer.

```json
{
  "error": "Forbidden: insufficient permissions"
}
```
* **Error Response (403 Forbidden):**

```json
{
  "error": "You are not allowed to assign to an external maintainer if the report is not in already in assigned status"
}
```
* **Error Response (403 Forbidden):**

```json
{
  "error": "You are not allowed to assign to an external maintainer a report that is not assigned to you"
}
```
* **Error Response (403 Forbidden):**

```json
{
  "error": "The external maintainer you want to assign to this report does not handle this category"
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
