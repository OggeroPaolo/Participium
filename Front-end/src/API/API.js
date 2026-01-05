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

// Get operators (internal officers) for a category
async function getCategoryOperators(categoryId) {
  if (!categoryId) {
    throw new Error("Category ID is required to fetch operators");
  }

  try {
    const response = await fetch(`${URI}/categories/${categoryId}/operators`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Failed to fetch operators for the category"
      );
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get external maintainers filtered by category/company
async function getExternalMaintainers(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.categoryId) {
      params.append("categoryId", filters.categoryId);
    }
    if (filters.companyId) {
      params.append("companyId", filters.companyId);
    }
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const response = await fetch(`${URI}/external-maintainers${queryString}`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      return await response.json();
    } else {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          errorData.errors?.[0] ||
          "Failed to fetch external maintainers"
      );
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get list of approved reports in the short format (public endpoint - no auth required)
async function getApprovedReports() {
  try {
    const response = await fetch(URI + "/reports/map/accepted", {
      method: "GET",
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
  const { title, description, category, photos, is_anonymous, address } =
    reportData;

  const formData = new FormData();
  formData.append("category_id", category);
  formData.append("title", title);
  formData.append("description", description);
  //TODO: Check if the address is collected in reportData
  formData.append("address", address);
  formData.append("position_lat", lat);
  formData.append("position_lng", lng);
  formData.append("is_anonymous", is_anonymous);

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
  const { status, note, categoryId, officerId } = reviewData;

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

    if (officerId) {
      body.officerId = officerId;
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
      throw new Error(
        errorData.error || errorData.errors?.[0] || "Failed to submit review"
      );
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

// Get assigned reports for technical officer review
async function getAssignedReports() {
  try {
    const response = await fetch(`${URI}/tech_officer/reports`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const assignedReports = await response.json();
      return assignedReports.reports || assignedReports;
    } else {
      throw new Error("Failed to fetch assigned reports");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get assigned reports for external maintainer review
async function getExternalAssignedReports() {
  try {
    const response = await fetch(`${URI}/ext_maintainer/reports`, {
      method: "GET",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
    });

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const assignedReports = await response.json();
      return assignedReports.reports || assignedReports;
    } else {
      throw new Error("Failed to fetch assigned reports");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Update status of a report (external maintainer only)
async function updateStatus(reportId, status) {
  try {
    const body = {
      status: status,
    };

    const response = await fetch(`${URI}/ext_maintainer/reports/${reportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${await getBearerToken()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || errorData.errors?.[0] || "Failed to update status"
      );
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

// Update status of a report (tech officer only)
async function updateTechOfficerStatus(reportId, status) {
  try {
    const body = {
      status: status,
    };

    const response = await fetch(`${URI}/tech_officer/reports/${reportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${await getBearerToken()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || errorData.errors?.[0] || "Failed to update status"
      );
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

// Assign an external maintainer to a report
async function assignExternalMaintainer(reportId, externalMaintainerId) {
  if (!externalMaintainerId) {
    throw new Error("External maintainer id is required");
  }

  try {
    const response = await fetch(
      `${URI}/tech_officer/reports/${reportId}/assign_external`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${await getBearerToken()}`,
        },
        body: JSON.stringify({ externalMaintainerId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          errorData.errors?.[0] ||
          "Failed to assign external maintainer"
      );
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

// Get comments for a report as an internal user
async function getCommentsInternal(reportId) {
  try {
    const response = await fetch(
      `${URI}/report/${reportId}/internal-comments`,
      {
        method: "GET",
        headers: {
          Authorization: `${await getBearerToken()}`,
        },
      }
    );

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const internalComments = await response.json();
      return Array.isArray(internalComments.comments)
        ? internalComments.comments
        : [];
    } else {
      throw new Error("Failed to fetch internal comments");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Get external comments for a report (citizen and technical officer)
async function getCommentsExternal(reportId) {
  try {
    const response = await fetch(
      `${URI}/report/${reportId}/external-comments`,
      {
        method: "GET",
        headers: {
          Authorization: `${await getBearerToken()}`,
        },
      }
    );

    if (response.status === 204) {
      return [];
    }

    if (response.ok) {
      const externalComments = await response.json();
      return Array.isArray(externalComments.comments)
        ? externalComments.comments
        : [];
    } else {
      throw new Error("Failed to fetch external comments");
    }
  } catch (err) {
    throw new Error("Network error: " + err.message);
  }
}

// Create a new comment
async function createComment(reportId, comment) {
  const response = await fetch(`${URI}/reports/${reportId}/internal-comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${await getBearerToken()}`,
    },
    body: JSON.stringify({
      text: comment,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.[0] || "Failed to post comment");
  }

  return await response.json();
}

// Create a new external comment
async function createExternalComment(reportId, comment) {
  const response = await fetch(`${URI}/reports/${reportId}/external-comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${await getBearerToken()}`,
    },
    body: JSON.stringify({
      text: comment,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to post comment");
  }

  return await response.json();
}

// verify email
async function verifyEmail(email, code) {
  const response = await fetch(`${URI}/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      code: code,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to verify code");
  }

  return await response.json();
}

// resend code if expired
async function resendCode(email) {
  const response = await fetch(`${URI}/resend-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to resend code");
  }

  return await response.json();
}

// Modify user information
async function modifyUserInfo(userInfo, profilePic, userId) {
  if (!userId) {
    throw new Error("User id is required");
  }

  const { telegram_username, email_notifications_enabled } = userInfo;

  const formData = new FormData();
  formData.append("telegram_username", telegram_username);
  formData.append(
    "email_notifications_enabled",
    email_notifications_enabled ? 1 : 0
  );
  formData.append("photo_profile", profilePic);

  try {
    const response = await fetch(`${URI}/users/${userId}`, {
      method: "PATCH",
      headers: {
        Authorization: `${await getBearerToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          errorData.errors?.[0] ||
          "Failed to modify user information"
      );
    }

    return await response.json();
  } catch (err) {
    throw new Error(err.message || "Network error");
  }
}

async function updateRole(userId, roleList) {
  try {
    const body = {
      roles_id: roleList,
    };

    const response = await fetch(`${URI}/operators/${userId}/roles`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${await getBearerToken()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || errorData.errors?.[0] || "Failed to update roles"
      );
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
  getCategoryOperators,
  getApprovedReports,
  createReport,
  getReport,
  getPendingReports,
  reviewReport,
  API_BASE_URL,
  getAssignedReports,
  getExternalAssignedReports,
  updateStatus,
  updateTechOfficerStatus,
  getExternalMaintainers,
  assignExternalMaintainer,
  getCommentsInternal,
  getCommentsExternal,
  createComment,
  createExternalComment,
  verifyEmail,
  resendCode,
  modifyUserInfo,
  updateRole,
};
