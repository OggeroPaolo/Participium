const URI = "http://localhost:3000";

// Register a new user
async function handleSignup(credentials) {
  // TODO
}

// Login a user
async function handleLogin(credentials) {
  // TODO
}

// Create internal user
async function createInternalUser(credentials) {
  // TODO
}

// Get list of user roles
async function getUserRoles() {
  try {
    const response = await fetch(URI + "/roles");
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

export { handleSignup, handleLogin, createInternalUser, getUserRoles };
