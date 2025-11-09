import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCcRJqHILVQdrq7__6FSFcgw7EP2Veq0ws",
  authDomain: "participium-53ae1.firebaseapp.com",
  projectId: "participium-53ae1",
  storageBucket: "participium-53ae1.firebasestorage.app",
  messagingSenderId: "512696154591",
  appId: "1:512696154591:web:2d95f7014b393b333aac6a",
  measurementId: "G-YEF6YTHNMP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };