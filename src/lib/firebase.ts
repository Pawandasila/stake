// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Added Firebase Storage import

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null; // Added storage instance variable
const googleProvider = new GoogleAuthProvider();

const firebaseClientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function initializeFirebaseServices() {
  const essentialKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket'];
  let allEssentialKeysPresentAndValid = true;

  for (const key of essentialKeys) {
    const value = firebaseClientConfig[key];
    if (!value || String(value).trim() === '') {
      allEssentialKeysPresentAndValid = false;
      console.error(
        `%c[VictoryVision Firebase CRITICAL ERROR] Essential Firebase config key "${key}" is missing or empty. Value: "${value}"`,
        'color: red; font-weight: bold;'
      );
    }
  }

  if (!allEssentialKeysPresentAndValid) {
    console.error(
      `%c[VictoryVision Firebase CRITICAL ERROR] Firebase initialization CANNOT proceed due to missing or empty essential configuration values. Firebase services will be UNAVAILABLE.
      %cTroubleshooting:
      1. Ensure '.env.local' or equivalent environment configuration is loaded.
      2. Verify variable names (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) and their values are correct.
      3. CRITICAL: Restart your Next.js development server after any .env changes.`,
      'color: red; font-weight: bold; font-size: 14px;',
      'color: red;'
    );
    return; // Stop initialization
  }
  
  console.log(
    '%c[VictoryVision Firebase Debug] All essential Firebase configuration keys appear present. Attempting Firebase initialization...',
    'color: blue; font-weight: bold;'
  );

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseClientConfig);
      console.log('%c[VictoryVision Firebase Debug] Firebase app initialized successfully via initializeApp().', 'color: green;');
    } else {
      app = getApp();
      console.log('%c[VictoryVision Firebase Debug] Firebase app already initialized. Using getApp().', 'color: LIMEGREEN;');
    }

    if (app && app.options && app.options.apiKey && app.options.authDomain && app.options.projectId && app.options.appId && app.options.storageBucket) {
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      storageInstance = getStorage(app); // Initialize Firebase Storage
      console.log('%c[VictoryVision Firebase Debug] Firebase Auth, Firestore, and Storage services obtained successfully.', 'color: green;');
    } else {
      console.error(
        '%c[VictoryVision Firebase Debug] Firebase app instance exists, but its options are missing or invalid AFTER initialization. Services might be NULL.',
        'color: red; font-weight: bold;'
      );
      console.log('%c[VictoryVision Firebase Debug] app.options checked:', 'color: red;', app?.options);
    }
  } catch (error: any) {
    console.error(
      '%c[VictoryVision Firebase Debug] Firebase SDK initialization FAILED. Error:',
      'color: red; font-weight: bold;',
      error.message || error
    );
  }
}


if (typeof window !== 'undefined' && !app) { // Ensure it runs only once in client and if app is not already set
    initializeFirebaseServices();
}


export { app, authInstance as auth, dbInstance as db, storageInstance as storage, googleProvider };
