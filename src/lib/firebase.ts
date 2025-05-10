
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
const googleProvider = new GoogleAuthProvider(); // This is fine, created regardless of app state

// This structure helps ensure all keys are at least checked for presence
const firebaseClientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional but good to include
};

if (typeof window !== 'undefined') {
  console.log(
    '%c[VictoryVision Firebase Debug] Checking Environment Variables (ensure .env.local is used and server restarted):',
    'color: orange; font-weight: bold;',
    {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET or EMPTY',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET or EMPTY',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET or EMPTY',
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET or EMPTY',
    }
  );

  const essentialKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  let allEssentialKeysPresentAndValid = true;

  for (const key of essentialKeys) {
    const value = firebaseClientConfig[key];
    if (!value || String(value).trim() === '') {
      allEssentialKeysPresentAndValid = false;
      console.error(
        `%c[VictoryVision Firebase CRITICAL ERROR] Essential Firebase config key "${key}" is missing or empty. Value: "${value}"`,
        'color: red; font-weight: bold;'
      );
      // No break here, log all missing keys
    }
  }

  if (!allEssentialKeysPresentAndValid) {
    console.error(
      `%c[VictoryVision Firebase CRITICAL ERROR] Firebase initialization CANNOT proceed due to missing or empty essential configuration values. Auth and DB services will be UNAVAILABLE.
      %cTroubleshooting:
      1. Ensure '.env.local' file exists in the project root.
      2. Verify variable names (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) and their values are correct.
      3. CRITICAL: Restart your Next.js development server (Ctrl+C, then 'npm run dev') after any .env.local changes.`,
      'color: red; font-weight: bold; font-size: 14px;',
      'color: red;'
    );
    // authInstance and dbInstance remain null by default
  } else {
    console.log(
      '%c[VictoryVision Firebase Debug] All essential Firebase configuration keys appear present and non-empty. Attempting Firebase initialization...',
      'color: blue; font-weight: bold;',
      // Provide only keys, not values, to avoid logging sensitive info if accidentally not undefined
      {
        apiKey: firebaseClientConfig.apiKey ? ' présents' : 'MANQUANT',
        authDomain: firebaseClientConfig.authDomain ? ' présents' : 'MANQUANT',
        projectId: firebaseClientConfig.projectId ? ' présents' : 'MANQUANT',
        appId: firebaseClientConfig.appId ? ' présents' : 'MANQUANT',
      }
    );

    try {
      if (getApps().length === 0) {
        app = initializeApp(firebaseClientConfig);
        console.log('%c[VictoryVision Firebase Debug] Firebase app initialized successfully via initializeApp(). App Name:', 'color: green;', app.name);
      } else {
        app = getApp();
        console.log('%c[VictoryVision Firebase Debug] Firebase app already initialized. Using getApp(). App Name:', 'color: LIMEGREEN;', app.name);
      }

      // After attempting to get/initialize app, check its options
      if (app && app.options && app.options.apiKey && app.options.authDomain && app.options.projectId && app.options.appId) {
        authInstance = getAuth(app);
        dbInstance = getFirestore(app);
        console.log('%c[VictoryVision Firebase Debug] Firebase Auth and Firestore services obtained successfully.', 'color: green;');
      } else {
        console.error(
          '%c[VictoryVision Firebase Debug] Firebase app instance exists, but its options (apiKey, authDomain, projectId, appId) are missing or invalid AFTER initialization. Auth/Firestore will be NULL.',
          'color: red; font-weight: bold;'
        );
        console.log('%c[VictoryVision Firebase Debug] app.options that failed the check:', 'color: red;', app?.options);
        // authInstance and dbInstance remain null
      }
    } catch (error: any) {
      console.error(
        '%c[VictoryVision Firebase Debug] Firebase SDK initialization FAILED. Error:',
        'color: red; font-weight: bold;',
        error.message || error,
        'Config attempted:', firebaseClientConfig // Be cautious logging full config if sensitive
      );
      // authInstance and dbInstance remain null
    }
  }
} else {
  // This case is for server-side rendering or build steps where 'window' is not defined.
  // Firebase client SDK is typically not initialized here.
  console.log("[VictoryVision Firebase Debug] Firebase client SDK initialization skipped (not in browser environment or window is undefined).");
}

export { app, authInstance as auth, dbInstance as db, googleProvider };
    