# Docker Deployment Guide

Follow the steps below to set up and run the application using Docker:

---

## 1. Create Project Directory

Create a new folder on your machine to store all Docker-related files for the project.

```bash
mkdir project-folder
cd project-folder
```

---

## 2. Add `docker-compose.yml`

In the root directory of the newly created folder, add the `docker-compose.yml` file.  
You can download or copy it from our GitHub repository.  
Make sure the file is named exactly:

```
docker-compose.yml
```

---

## 3. Create Required Subfolders

Inside the project folder, create two subfolders with the following names:

```bash
mkdir Back-end
mkdir Front-end
```

---

## 4. Add Environment Files

Place the environment files in their respective folders:

- Place the **front-end `.env`** file inside the `Front-end` folder.
- Place the **back-end `.env`** file inside the `Back-end` folder.

Your folder structure should look like this:

```
project-folder/
│
├── docker-compose.yml
│
├── Front-end/
│   └── .env
│
└── Back-end/
    └── .env
```

---

## 5. Environment Variable Configuration

The `.env` files are required to store sensitive configuration values.  
They **must include keys for Firebase (authentication)** and **Cloudinary (for image storage)**.

Below are separate examples for the Back-end and Front-end `.env` files:

---

### 🛠️ Back-end `.env` (Server)

Used mainly for authentication, server configurations, and managing secure credentials.

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

### 💻 Front-end `.env` (Client)

Used for connecting to Firebase from the browser using Vite.  
All variables must be prefixed with `VITE_` for Vite to expose them to the front-end.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

> ⚠️ These values should be securely shared and **must never be pushed to GitHub or any public repository**.

---

## 6. Pull Docker Images

To download the required Docker images specified in your `docker-compose.yml`, run:

```bash
docker compose pull
```

> Note: Depending on your Docker version, both `docker compose` and `docker-compose` may work.  
> The modern and recommended syntax is `docker compose`.

---

## 7. Start the Containers

To build (if necessary) and start all services defined in the `docker-compose.yml`, use:

```bash
docker compose up
```

To run the containers in the background (detached mode), use:

```bash
docker compose up -d
```

---

## 8. Stop the Containers (Optional)

To stop and remove the containers created by `up`, use:

```bash
docker compose down
```

---

## 9. Users credentials

| Type     | Email               | Password          |
|----------|---------------------|-------------------|
| Citizen  | citizen@example.com | citizenexample    |
| Public relations officer | operator@example.com| operatorexample   |
| Admin    | admin@example.com   | adminexample      |

```bash
docker compose down
```

---

You're all set! 🚀  
Your application should now be running in Docker.

The front-end will be accessible at `http://localhost:4173`, while the back-end server will run on `http://localhost:3000`.
