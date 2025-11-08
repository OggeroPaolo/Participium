const URI = "http://localhost:3000";

// Register a new user
async function handleSignup(credentials) {
  const { firstName, lastName, username, email, firebaseToken, firebaseUid } = credentials;

  const response = await fetch(`${URI}/user-registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firebaseToken}`
    },
    body: JSON.stringify({
      firebaseUid: firebaseUid,
      firstName: firstName,
      lastName: lastName,
      username: username,
      email: email
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to register user");
  }

  return await response.json();
}

export { handleSignup };
