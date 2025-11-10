import firebaseAdmin from "../config/firebaseAdmin.js";
import UserDAO from "../dao/UserDAO.js";

export class UserAlreadyExistsError extends Error {}
export class EmailOrUsernameConflictError extends Error{}

export async function createUserWithFirebase(
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
    role_id?: number;
  },
  userDaoInstance: UserDAO
) {
  // Controllo conflitti email/username a priori
  const conflictUser = await userDaoInstance.findUserByEmailOrUsername(userData.email, userData.username);
  if (conflictUser) {
    throw new EmailOrUsernameConflictError("Email or username already in use");
  }

  // Creo utente in Firebase
  const firebaseUser = await firebaseAdmin.auth().createUser({
    email: userData.email,
    password: userData.password,
    displayName: `${userData.firstName} ${userData.lastName}`,
  });

  const firebaseUid = firebaseUser.uid;

  try {
    // controllo duplicati da firebaseUid (in caso flussi disparati)
    const existingUser = await userDaoInstance.findUserByUid(firebaseUid);
    if (existingUser) {
      // cancello utente Firebase per rollback
      await firebaseAdmin.auth().deleteUser(firebaseUid);
      throw new UserAlreadyExistsError("User already registered");
    }

    // creo l'utente nel DB locale
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
    // rollback firebase user se errore nel DB
    await firebaseAdmin.auth().deleteUser(firebaseUid);
    throw error;
  }
}