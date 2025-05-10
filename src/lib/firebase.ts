// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
const googleProvider = new GoogleAuthProvider(); // This is fine to initialize here

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
  console.log('%c[VictoryVision Firebase Debug] Attempting Firebase initialization...', 'color: blue; font-weight: bold;');
  
  console.log('%c[VictoryVision Firebase Debug] Using Firebase Config (NEXT_PUBLIC_ values):', 'color: orange;', {
    apiKeyExists: !!firebaseClientConfig.apiKey, // Log existence, not the key itself
    authDomain: firebaseClientConfig.authDomain,
    projectId: firebaseClientConfig.projectId,
    storageBucket: firebaseClientConfig.storageBucket,
    messagingSenderId: firebaseClientConfig.messagingSenderId,
    appId: firebaseClientConfig.appId,
    measurementId: firebaseClientConfig.measurementId,
  });

  const essentialKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket'];
  let allEssentialKeysPresentAndValid = true;

  for (const key of essentialKeys) {
    const value = firebaseClientConfig[key];
    if (!value || String(value).trim() === '' || String(value).includes('undefined')) {
      allEssentialKeysPresentAndValid = false;
      console.error(
        `%c[VictoryVision Firebase CRITICAL ERROR] Essential Firebase config key "${key}" is MISSING, EMPTY, or contains 'undefined'. Value: "${value}"`,
        'color: red; font-weight: bold;'
      );
    }
  }

  if (!allEssentialKeysPresentAndValid) {
    console.error(
      `%c[VictoryVision Firebase CRITICAL ERROR] Firebase initialization CANNOT proceed due to missing, empty, or invalid essential configuration values. Firebase services will be UNAVAILABLE.
      %cTroubleshooting Steps:
      1. Ensure your '.env.local' file is correctly placed in the project root.
      2. Verify all 'NEXT_PUBLIC_FIREBASE_...' variable names and their assigned values in '.env.local' are correct and do not contain typos or the literal string "undefined".
      3. CRITICAL: You MUST restart your Next.js development server (e.g., 'npm run dev') after making any changes to the '.env.local' file for them to take effect.
      4. Double-check that you are not accidentally overriding these environment variables elsewhere in your project or deployment environment with incorrect values.`,
      'color: red; font-weight: bold; font-size: 14px;',
      'color: red;'
    );
    // Set instances to null explicitly if they were somehow set before this check.
    app = null;
    authInstance = null;
    dbInstance = null;
    storageInstance = null;
    return; 
  }
  
  console.log(
    '%c[VictoryVision Firebase Debug] All essential Firebase configuration keys appear present and valid. Proceeding with Firebase SDK initialization.',
    'color: green;'
  );

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseClientConfig);
      console.log('%c[VictoryVision Firebase Debug] Firebase app initialized successfully via initializeApp().', 'color: green;');
    } else {
      app = getApp();
      console.log('%c[VictoryVision Firebase Debug] Firebase app already initialized. Using getApp().', 'color: limegreen;');
    }

    if (app && app.options && app.options.apiKey) { // Check a key option to ensure app is valid
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      storageInstance = getStorage(app);
      console.log('%c[VictoryVision Firebase Debug] Firebase Auth, Firestore, and Storage service instances obtained successfully.', 'color: green;');
    } else {
      console.error(
        '%c[VictoryVision Firebase CRITICAL ERROR] Firebase app instance exists, but its options (e.g., apiKey) are missing or invalid AFTER initialization attempt. Services (auth, db, storage) will be NULL. This often means the firebaseClientConfig passed to initializeApp was incomplete or invalid despite earlier checks.',
        'color: red; font-weight: bold;'
      );
      console.log('%c[VictoryVision Firebase Debug] Current app instance after attempt:', 'color: red;', app);
      console.log('%c[VictoryVision Firebase Debug] app.options checked post-init:', 'color: red;', app?.options);
      // Ensure instances are null if app is not valid
      authInstance = null;
      dbInstance = null;
      storageInstance = null;
    }
  } catch (error: any) {
    console.error(
      '%c[VictoryVision Firebase CRITICAL ERROR] Firebase SDK initialization FAILED with an exception. Error:',
      'color: red; font-weight: bold;',
      error.message || error
    );
    // Ensure instances are null on exception
    app = null;
    authInstance = null;
    dbInstance = null;
    storageInstance = null;
  }
}

// Initialize Firebase on client-side module load
if (typeof window !== 'undefined' && !app && !authInstance && !dbInstance && !storageInstance) {
    initializeFirebaseServices();
} else if (typeof window !== 'undefined' && (app || authInstance || dbInstance || storageInstance)) {
    console.log('%c[VictoryVision Firebase Debug] Firebase services already seem initialized. Skipping re-initialization.', 'color: limegreen;');
}


export { app, authInstance as auth, dbInstance as db, storageInstance as storage, googleProvider };
