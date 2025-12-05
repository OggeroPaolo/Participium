import { getBearerToken } from "../firebaseService";

const API_BASE_URL = "http://localhost:3000";
const URI = API_BASE_URL;

// Register a new user
async function handleSignup(credentials) {
  const { firstName, lastName, username, email, password } = credentials;

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
      password: password,
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
      role_id: role_id,
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

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const users = await response.json();
      return users;
    } else {
      throw new Error("Failed to fetch operators");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get current user data from backend
async function getUserData(uid) {
  try {
    const response = await fetch(`${URI}/users/${uid}`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return userData;
    } else {
      throw new Error("Failed to fetch user data");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get list of categories
async function getCategories() {
  try {
    const response = await fetch(URI + "/categories", {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });
    if (response.ok) {
      const categories = await response.json();
      return categories;
    } else {
      throw new Error("Failed to fetch categories");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get list of approved reports in the short format
async function getApprovedReports() {
  try {
    const response = await fetch(URI + "/reports/map/accepted", {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const approvedReports = await response.json();
      return approvedReports.reports;
    } else {
      throw new Error("Failed to fetch reports");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Create a new report
async function createReport(reportData, lat, lng) {
  const { title, description, category, photos } = reportData;

  const formData = new FormData();
  formData.append("category_id", category);
  formData.append("title", title);
  formData.append("description", description);
  formData.append("position_lat", lat);
  formData.append("position_lng", lng);
  formData.append("is_anonymous", false);

  // Append each photo
  photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  const response = await fetch(`${URI}/reports`, {
    method: "POST",
    headers: {
      Authorization: `${await getBearerToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to upload report");
  }

  return await response.json();
}

// Get a single report by id
async function getReport(rid) {
  try {
    const response = await fetch(`${URI}/reports/${rid}`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.ok) {
      const report = await response.json();
      return report.report;
    } else {
      throw new Error("Failed to fetch report data");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get pending reports for officer review
async function getPendingReports() {
  try {
    const response = await fetch(`${URI}/reports?status=pending_approval`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const pendingReports = await response.json();
      return pendingReports.reports || pendingReports;
    } else {
      throw new Error("Failed to fetch pending reports");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Review a report (approve or reject)
async function reviewReport(reportId, reviewData) {
  const { status, note, categoryId } = reviewData;

  try {
    const body = {
      status: status,
    };

    if (note) {
      body.note = note;
    }

    if (categoryId) {
      body.categoryId = categoryId;
    }

    const response = await fetch(`${URI}/pub_relations/reports/${reportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${await getBearerToken()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.errors?.[0] || "Failed to submit review");
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

export {
  handleSignup,
  createInternalUser,
  getUserRoles,
  getInternalUsers,
  getUserData,
  getCategories,
  getApprovedReports,
  createReport,
  getReport,
  getPendingReports,
  reviewReport,
  API_BASE_URL,
};
