
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Log environment variables to check if they are loaded
// This is helpful for debugging in both local and Vercel environments
console.log("--- Firebase Environment Variables Status ---");
console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "SET" : "UNDEFINED");
console.log("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? "SET (Optional)" : "UNDEFINED (Optional)");
console.log("-----------------------------------------");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Check if all *strictly required* Firebase config values are present
// For basic Auth and Firestore, apiKey, authDomain, and projectId are typically the most critical.
const strictlyRequiredConfigKeys: (keyof Omit<typeof firebaseConfig, "measurementId">)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  // You might add others like appId if your Firebase setup strictly depends on them early.
  // storageBucket and messagingSenderId might not be critical for initial auth/firestore unless used immediately.
];

let hasAllStrictlyRequiredConfig = true;
for (const key of strictlyRequiredConfigKeys) {
  if (!firebaseConfig[key]) {
    console.error(`Firebase Initialization Aborted: Critical config key "${key}" is missing or undefined. Check your .env.local file and Vercel environment variables. Ensure the server was restarted after changes.`);
    hasAllStrictlyRequiredConfig = false;
    break; 
  }
}

if (hasAllStrictlyRequiredConfig) {
  if (!getApps().length) {
    try {
      console.log("Attempting to initialize Firebase with provided config (API key masked).");
      // console.log("Full config for init (DEBUG, DO NOT LEAVE IN PROD UNMASKED):", firebaseConfig); // UNCOMMENT FOR LOCAL DEBUG ONLY
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
      // Initialize auth and db immediately after app initialization
      auth = getAuth(app);
      db = getFirestore(app);
      console.log("Firebase Auth and Firestore services obtained.");
    } catch (error) {
      console.error("Firebase initialization error:", error);
      // app, auth, db will remain null
    }
  } else {
    app = getApp();
    console.log("Firebase app already initialized. Using existing instance.");
    // Ensure auth and db are also obtained if app exists but they are somehow null
    if (app && !auth) {
      try {
        auth = getAuth(app);
        console.log("Firebase Auth service obtained from existing app.");
      } catch (e) {
        console.error("Error re-getting Auth from existing app:", e);
      }
    }
    if (app && !db) {
      try {
        db = getFirestore(app);
        console.log("Firebase Firestore service obtained from existing app.");
      } catch (e) {
        console.error("Error re-getting Firestore from existing app:", e);
      }
    }
  }
} else {
  console.error("Firebase initialization was skipped due to missing critical configuration values. App functionality requiring Firebase will be heavily affected or non-functional.");
}

export { app, auth, db };
