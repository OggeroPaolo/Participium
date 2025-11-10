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
    // Get current user without creating new listener
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return reject(new Error("User not logged in"));
    }

    // Get token with force refresh to check expiration
    currentUser.getIdToken(true)
      .then(idToken => resolve(`Bearer ${idToken}`))
      .catch(error => {
        console.error("Failed to get token:", error);
        reject(error);
      });
  });
}