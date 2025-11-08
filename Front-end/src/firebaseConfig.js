import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCcRJqHILVQdrq7__6FSFcgw7EP2Veq0ws",
  authDomain: "participium-53ae1.firebaseapp.com",
  projectId: "participium-53ae1",
  storageBucket: "participium-53ae1.firebasestorage.app",
  messagingSenderId: "512696154591",
  appId: "TUO_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };