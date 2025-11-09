import { auth } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";

async function testLogin(email, password) {
    console.log("Attempting login with:", email);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login success! User:", userCredential.user.email);
    } catch (error) {
        console.error("Login failed:", error.code, error.message);
    }
}

testLogin("nooooo@example.com", "validpassword");
