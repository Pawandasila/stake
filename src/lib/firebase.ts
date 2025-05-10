
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
const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional, but include if set
};

if (typeof window !== 'undefined') {
  // Log the raw environment variables as seen by the script
  console.log('%c[VictoryVision Firebase Debug] Attempting to read Firebase config from environment variables:', 'color: orange; font-weight: bold;', {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET or EMPTY',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? 'SET' : 'NOT SET or EMPTY (Optional)',
  });

  // Log the config object that will be used for initialization checks
  console.log('%c[VictoryVision Firebase Debug] Parsed Firebase config object:', 'color: blue; font-weight: bold;', firebaseClientConfig);

  const essentialKeys: (keyof typeof firebaseClientConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingEssentialKeys = essentialKeys.filter(key => !firebaseClientConfig[key] || firebaseClientConfig[key]?.trim() === '');

  if (missingEssentialKeys.length > 0) {
    console.error(
      `%c[VictoryVision Firebase CRITICAL ERROR] FIREBASE INITIALIZATION FAILED:
%cThe following essential Firebase environment variables are missing, empty, or invalid:
%c${missingEssentialKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`).join(', ')}

%cFirebase services (Auth, Firestore) will NOT be available.
%cTroubleshooting Steps:
1. Verify that your '.env' or '.env.local' file exists in the project root.
2. Ensure the variable names in the .env file EXACTLY match (e.g., NEXT_PUBLIC_FIREBASE_API_KEY). They MUST start with NEXT_PUBLIC_.
3. Confirm that the values assigned to these variables are correct and not empty strings.
4. CRITICAL: You MUST restart your Next.js development server (e.g., Ctrl+C, then 'npm run dev' or 'yarn dev') after making any changes to .env files.
5. If deployed, ensure these environment variables are correctly set in your hosting provider's dashboard.

%cCurrent problematic configuration values:`,
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
    // Explicitly set auth and db to null if essential config is missing
    authInstance = null;
    dbInstance = null;
  } else {
    // All essential keys appear to be present, proceed with initialization
    const configForFirebaseSDK: Record<string, string> = {};
    // Filter out any keys that might be null, undefined, or empty strings, even if not "essential"
    for (const key in firebaseClientConfig) {
      const typedKey = key as keyof typeof firebaseClientConfig;
      const value = firebaseClientConfig[typedKey];
      if (value && typeof value === 'string' && value.trim() !== '') {
        configForFirebaseSDK[typedKey] = value;
      }
    }
    
    console.log('%c[VictoryVision Firebase Debug] Cleaned config object being passed to initializeApp:', 'color: green; font-weight: bold;', configForFirebaseSDK);

    if (getApps().length === 0) {
      try {
        app = initializeApp(configForFirebaseSDK as FirebaseOptions);
        console.log("%c[VictoryVision Firebase Debug] Firebase app initialized successfully via initializeApp().", "color: green;");
      } catch (e: any) {
        console.error("%c[VictoryVision Firebase Debug] Firebase SDK initializeApp() FAILED. Error:", "color: red; font-weight: bold;", e, "Config attempted:", configForFirebaseSDK);
        app = undefined; // Ensure app is undefined if init fails
      }
    } else {
      app = getApp();
      console.log("%c[VictoryVision Firebase Debug] Firebase app already initialized. Using getApp().", "color: LIMEGREEN;"); // Changed color for distinction
    }

    if (app) {
      try {
        // After getting an app instance (either new or existing), check its options
        if (app.options && app.options.apiKey && app.options.projectId) {
          authInstance = getAuth(app);
          dbInstance = getFirestore(app);
          console.log("%c[VictoryVision Firebase Debug] Firebase Auth and Firestore services successfully obtained from app instance.", "color: green;");
        } else {
          console.error("%c[VictoryVision Firebase Debug] Firebase app instance exists, but its options (apiKey/projectId) are missing or invalid. Auth/Firestore NOT initialized. App options:", "color: red; font-weight: bold;", app.options);
          authInstance = null;
          dbInstance = null;
        }
      } catch (error: any) {
        console.error("%c[VictoryVision Firebase Debug] Error during getAuth() or getFirestore() call. Firebase app instance might be malformed or services not enabled in Firebase console. Error details:", "color: red; font-weight: bold;", error);
        authInstance = null;
        dbInstance = null;
      }
    } else {
        console.error("%c[VictoryVision Firebase Debug] Firebase app instance is NOT available (either initializeApp failed or getApp returned unexpectedly). Auth/Firestore NOT initialized.", "color: red; font-weight: bold;");
        authInstance = null; // Ensure they are null
        dbInstance = null;
    }
  }
} else {
  // This block runs on the server or in a non-browser environment.
  // Firebase client SDK typically isn't initialized here for client-side auth.
  // console.log("%c[VictoryVision Firebase Debug] Firebase client SDK initialization skipped (not in browser environment or window is undefined).", "color: gray;");
}

// Export the instances. They will be null if initialization failed.
export { app, authInstance as auth, dbInstance as db, googleProvider };
