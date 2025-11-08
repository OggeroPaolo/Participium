// src/firebaseAuth.js
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
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