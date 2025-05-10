
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Define these at the top level so they are either properly initialized or explicitly null.
let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | null = null; // Initialize to null
let dbInstance: Firestore | null = null; // Initialize to null
const googleProvider = new GoogleAuthProvider();

// This object holds the configuration read from environment variables.
// !! IMPORTANT !!
// Make sure these environment variables are defined in a '.env.local' file
// in the root of your project, and that you RESTART your Next.js development
// server after any changes to this file.
const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  // Google OAuth specific - not directly used by Firebase client SDK init for email/pass or Google Popup
  // These are more for custom server-side OAuth flows or specific Google API calls.
  // googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  // googleClientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
};

if (typeof window !== 'undefined') {
  console.log('%c[VictoryVision Firebase Debug] Reading Firebase config from environment variables (ensure .env.local is used and server restarted):', 'color: orange; font-weight: bold;', {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET or EMPTY',
    // Optional ones
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET or EMPTY (Optional for Auth/Firestore core)',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'NOT SET or EMPTY (Optional for Auth/Firestore core)',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? 'SET' : 'NOT SET or EMPTY (Optional)',
  });

  const essentialKeys: (keyof Pick<typeof firebaseClientConfig, 'apiKey' | 'authDomain' | 'projectId' | 'appId'>)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingEssentialKeys = essentialKeys.filter(key => !firebaseClientConfig[key] || firebaseClientConfig[key]?.trim() === '');

  if (missingEssentialKeys.length > 0) {
    console.error(
      `%c[VictoryVision Firebase CRITICAL ERROR] FIREBASE INITIALIZATION FAILED:
%cThe following essential Firebase environment variables are missing, empty, or invalid in your .env.local file:
%c${missingEssentialKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`).join(', ')}

%cFirebase services (Auth, Firestore) will NOT be available.
%cTroubleshooting Steps:
1. Ensure you have a '.env.local' file in the project root.
2. Verify variable names in '.env.local' EXACTLY match (e.g., NEXT_PUBLIC_FIREBASE_API_KEY). They MUST start with NEXT_PUBLIC_.
3. Confirm values are correct, not empty strings, and properly quoted if they contain special characters.
4. CRITICAL: You MUST restart your Next.js development server (Ctrl+C, then 'npm run dev' or 'yarn dev') after changes to .env.local.
5. If deployed, ensure these environment variables are correctly set in your hosting provider's dashboard.

%cCurrent problematic configuration values from process.env:`,
      'font-weight: bold; color: red; font-size: 16px;',
      'color: red;',
      'font-weight: bold; color: red;',
      'color: black;',
      'color: black;',
      'color: red; font-weight: bold;',
       missingEssentialKeys.reduce((acc, key) => {
        acc[key] = firebaseClientConfig[key] || 'MISSING/EMPTY';
        return acc;
      }, {} as Record<string, string>)
    );
    authInstance = null;
    dbInstance = null;
  } else {
    const configForFirebaseSDK: FirebaseOptions = {};
    for (const key in firebaseClientConfig) {
      const typedKey = key as keyof typeof firebaseClientConfig;
      const value = firebaseClientConfig[typedKey];
      if (value && typeof value === 'string' && value.trim() !== '') {
        configForFirebaseSDK[typedKey] = value.trim(); // Trim values before using
      }
    }
    
    console.log('%c[VictoryVision Firebase Debug] Cleaned config object being passed to initializeApp:', 'color: blue; font-weight: bold;', JSON.stringify(configForFirebaseSDK));

    if (getApps().length === 0) {
      try {
        app = initializeApp(configForFirebaseSDK);
        console.log("%c[VictoryVision Firebase Debug] Firebase app initialized successfully via initializeApp().", "color: green;");
        console.log("%c[VictoryVision Firebase Debug] app.name:", "color: green;", app.name);
        console.log("%c[VictoryVision Firebase Debug] app.options (SHOULD MATCH YOUR CONFIG):", "color: green; font-weight: bold;", JSON.stringify(app.options, null, 2));
      } catch (e: any) {
        console.error("%c[VictoryVision Firebase Debug] Firebase SDK initializeApp() FAILED. Error:", "color: red; font-weight: bold;", e.message || e, "Config attempted:", JSON.stringify(configForFirebaseSDK));
        app = undefined; 
      }
    } else {
      app = getApp();
      console.log("%c[VictoryVision Firebase Debug] Firebase app already initialized. Using getApp().", "color: LIMEGREEN;");
      console.log("%c[VictoryVision Firebase Debug] Existing app.name:", "color: LIMEGREEN;", app.name);
      console.log("%c[VictoryVision Firebase Debug] Existing app.options (SHOULD MATCH YOUR CONFIG):", "color: LIMEGREEN; font-weight: bold;", JSON.stringify(app.options, null, 2));
    }

    if (app) {
      // Stricter check on the options object from the initialized app
      const { apiKey, authDomain, projectId, appId } = app.options;
      if (apiKey && authDomain && projectId && appId) {
        try {
          authInstance = getAuth(app);
          dbInstance = getFirestore(app);
          console.log("%c[VictoryVision Firebase Debug] Firebase Auth and Firestore services successfully obtained from app instance.", "color: green;");
        } catch (serviceError: any) {
            console.error("%c[VictoryVision Firebase Debug] Error obtaining Auth/Firestore services from a valid app instance. Error:", "color: red; font-weight: bold;", serviceError.message || serviceError);
            authInstance = null;
            dbInstance = null;
        }
      } else {
        console.error("%c[VictoryVision Firebase Debug] Firebase app instance exists, but its options (apiKey, authDomain, projectId, appId) are missing or invalid AFTER initialization. Auth/Firestore NOT initialized.", "color: red; font-weight: bold;");
        console.log("%c[VictoryVision Firebase Debug] app.options that failed the check:", "color: red;", JSON.stringify(app.options, null, 2));
        authInstance = null;
        dbInstance = null;
      }
    } else {
        console.error("%c[VictoryVision Firebase Debug] Firebase app instance is NOT available (initializeApp failed or getApp returned unexpectedly). Auth/Firestore NOT initialized.", "color: red; font-weight: bold;");
        authInstance = null;
        dbInstance = null;
    }
  }
} else {
  // console.log("%c[VictoryVision Firebase Debug] Firebase client SDK initialization skipped (not in browser environment or window is undefined).", "color: gray;");
}

export { app, authInstance as auth, dbInstance as db, googleProvider };

    