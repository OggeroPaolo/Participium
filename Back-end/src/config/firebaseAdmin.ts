import admin from "firebase-admin";
import { env } from "./env.js"

const firebaseAdmin = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  }),
  databaseURL: `https://${env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

export default firebaseAdmin;