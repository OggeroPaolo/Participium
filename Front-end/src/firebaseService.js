import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseConfig";

// Effettua login con email e password tramite Firebase
export async function loginWithEmail(credentials) {
    const { email, password } = credentials;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

// Effettua logout da Firebase
export async function logout() {
    await signOut(auth);
}

export function getBearerToken() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return reject(new Error("User not logged in"));

      const idToken = await user.getIdToken();
      resolve(`Bearer ${idToken}`);
    });
  });
}