import firebaseAdmin from "../config/firebaseAdmin.js";
import UserDAO from "../dao/UserDAO.js";
import type { User, UserRoleDTO } from "../models/user.js";

export class UserAlreadyExistsError extends Error {}
export class EmailOrUsernameConflictError extends Error {}

/**
 * Creates a new user both in Firebase and local DB.
 * Handles rollback in case of DB errors.
 */
export async function createUserWithFirebase(
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role_id?: number;
  },
  userDaoInstance: UserDAO
): Promise<User> {
  // Check for conflicts first
  const conflictUser = await userDaoInstance.findUserByEmailOrUsername(
    userData.email,
    userData.username
  );
  if (conflictUser) {
    throw new EmailOrUsernameConflictError("Email or username already in use");
  }

  // Create Firebase user
  const firebaseUser = await firebaseAdmin.auth().createUser({
    email: userData.email,
    password: userData.password,
    displayName: `${userData.firstName} ${userData.lastName}`,
  });

  const firebaseUid = firebaseUser.uid;

  try {
    // Double-check no existing user with same Firebase UID
    const existingUser = await userDaoInstance.findUserByUid(firebaseUid);
    if (existingUser) {
      await firebaseAdmin.auth().deleteUser(firebaseUid);
      throw new UserAlreadyExistsError("User already registered");
    }

    // Create local DB user
    const newUser = await userDaoInstance.createUser({
      firebaseUid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      email: userData.email,
      role_id: userData.role_id,
    });

    return newUser;
  } catch (error) {
    // Rollback Firebase user if DB fails
    await firebaseAdmin.auth().deleteUser(firebaseUid);
    throw error;
  }
}

/**
 * Maps a single DB row to a User object.
 */
export function mapUserWithRoles(row: any): User | null {
  if (!row) return null;

  return {
    id: row.id,
    firebase_uid: row.firebase_uid,
    email: row.email,
    username: row.username,
    first_name: row.first_name,
    last_name: row.last_name,
    profile_photo_url: row.profile_photo_url ?? null,
    telegram_username: row.telegram_username ?? null,
    email_notifications_enabled: row.email_notifications_enabled ?? 0,
    is_active: row.is_active ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at ?? null,
    roles: row.role_name
      ? [{ role_name: row.role_name, role_type: row.role_type }]
      : [],
  };
}

/**
 * Maps multiple DB rows to an array of Users, aggregating roles.
 */
export function mapUsersList(rows: any[]): User[] {
  const usersMap = new Map<number, User>();

  for (const row of rows) {
    const mappedUser = mapUserWithRoles(row);
    if (!mappedUser) continue;

    const existingUser = usersMap.get(mappedUser.id);
    if (existingUser) {
      // Append any new roles not already present
      mappedUser.roles.forEach(role => {
        if (!existingUser.roles.some(r => r.role_name === role.role_name && r.role_type === role.role_type)) {
          existingUser.roles.push(role);
        }
      });
    } else {
      usersMap.set(mappedUser.id, mappedUser);
    }
  }

  return Array.from(usersMap.values());
}
