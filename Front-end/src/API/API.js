import {getBearerToken} from "../firebaseService"

const URI = "http://localhost:3000";

// Register a new user
async function handleSignup(credentials) {
  const { firstName, lastName, username, email, password } =
    credentials;

  const response = await fetch(`${URI}/user-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: firstName,
      lastName: lastName,
      username: username,
      email: email,
      password: password
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to register user");
  }

  return await response.json();
}

// Create internal user
async function createInternalUser(credentials) {
  const { firstName, lastName, username, email, password, role_id } =
    credentials;

  const response = await fetch(`${URI}/operator-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${await getBearerToken()}`,
    },
    body: JSON.stringify({
      firstName: firstName,
      lastName: lastName,
      username: username,
      email: email,
      password: password,
      role_id: role_id
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to register user");
  }

  return await response.json();
}

// Get list of user roles
async function getUserRoles() {
  try {
    const response = await fetch(URI + "/roles", {
    method: "GET",
    headers: {
      Authorization: `${await getBearerToken()}`,
    },
  });
    if (response.ok) {
      const roles = await response.json();
      return roles;
    } else {
      throw new Error("Failed to fetch user roles");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get internal users as an admin
async function getInternalUsers() {
  try {
    const response = await fetch(URI + "/operators", {
    method: "GET",
    headers: {
      Authorization: `${await getBearerToken()}`,
    },
  });
    if (response.ok) {
      const roles = await response.json();
      return roles;
    } else {
      throw new Error("Failed to fetch operators");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

export { handleSignup, createInternalUser, getUserRoles, getInternalUsers };
