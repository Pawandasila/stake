// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined = undefined;
let auth: Auth;
let db: Firestore;
const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  // Define config directly inside the client-side check
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
  };

  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  let configIsValid = true;
  const missingOrEmptyKeys: string[] = [];

  for (const key of essentialKeys) {
    const value = firebaseConfig[key];
    if (typeof value !== 'string' || value.trim() === '') {
      configIsValid = false;
      // Construct the full env var name for clearer logging
      missingOrEmptyKeys.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`);
    }
  }
   // Check projectId specifically as it's crucial for auth/configuration-not-found
  if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === '') {
    configIsValid = false;
    if (!missingOrEmptyKeys.includes('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) {
      missingOrEmptyKeys.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
  }


  if (!configIsValid) {
    console.error(
      `%cFIREBASE CONFIGURATION ERROR:
%cThe following essential Firebase environment variables are missing, empty, or not strings in your .env file:
%c${missingOrEmptyKeys.join(', ')}

%cPlease check the following:
1. Your project root contains a '.env' or '.env.local' file.
2. Inside this file, variables are defined like: NEXT_PUBLIC_FIREBASE_API_KEY="your_actual_key_here"
3. The variable names EXACTLY match (e.g., NEXT_PUBLIC_FIREBASE_API_KEY). Ensure they start with NEXT_PUBLIC_.
4. The values assigned are not empty (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID="").
5. You have FULLY STOPPED and RESTARTED your Next.js development server (e.g., Ctrl+C, then 'npm run dev' or 'yarn dev'). This includes deleting the .next folder if issues persist.

Current configuration object that was attempted (values might be 'undefined' if not loaded from .env):`,
      'font-weight: bold; color: red; font-size: 16px;',
      'color: red;',
      'font-weight: bold; color: red;',
      'color: black;',
      { // Log the config object that was constructed
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      }
    );
  }

  if (getApps().length === 0) {
    if (configIsValid) {
      try {
        // Construct the config object for initializeApp carefully, ensuring optional fields are handled.
        const configToInitialize: Record<string, string> = {};
        let key: keyof typeof firebaseConfig;
        for (key in firebaseConfig) {
          if (firebaseConfig[key] && typeof firebaseConfig[key] === 'string' && (firebaseConfig[key] as string).trim() !== '') { // Only add if value is present, a string, and not empty
            configToInitialize[key] = firebaseConfig[key]!;
          }
        }

        // Re-check if all essential keys made it into configToInitialize
        let allEssentialInitialized = true;
        for (const eKey of essentialKeys) {
            if (!configToInitialize[eKey]) {
                allEssentialInitialized = false;
                if (!missingOrEmptyKeys.includes(`NEXT_PUBLIC_FIREBASE_${eKey.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`)) {
                    missingOrEmptyKeys.push(`NEXT_PUBLIC_FIREBASE_${eKey.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`);
                }
            }
        }

        if (!allEssentialInitialized) {
             console.error(`%cFirebase Initialization Error: Not all essential config keys have values after filtering. Missing or empty: ${missingOrEmptyKeys.join(', ')}. Cannot initialize.`, 'color: red; font-weight: bold;', configToInitialize);
        } else {
            app = initializeApp(configToInitialize as import('firebase/app').FirebaseOptions);
            console.log("%cFirebase app initialized successfully with config:", "color: green;", configToInitialize);
        }

      } catch (e) {
        console.error("Firebase SDK initializeApp call failed. This often follows a configuration error or an issue with the Firebase project setup itself. Double-check API keys, project ID, and ensure Authentication service is enabled in your Firebase console.", e);
      }
    } else {
      console.warn("Firebase app initialization SKIPPED due to invalid or missing configuration. See error logged above.");
    }
  } else {
    app = getApp();
    console.log("%cFirebase app already initialized. Using existing app.", "color: orange;");
  }
}

try {
  if (app && app.name) {
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    if (typeof window !== 'undefined') {
        console.error("Firebase Auth and Firestore CANNOT be initialized because the Firebase app instance is NOT valid. This usually follows a configuration error (check logs above) or services not being enabled in Firebase console. Ensure NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env file and that the Next.js server has been FULLY RESTARTED.");
    }
    // Provide non-functional stubs to prevent app crashes if auth/db are used before initialization
    // These will likely lead to errors if used, but prevent immediate undefined errors.
    auth = { currentUser: null, onAuthStateChanged: () => (() => {}), signOut: async () => {}, signInWithPopup: async () => { throw new Error("Firebase Auth not initialized"); }} as unknown as Auth;
    db = { type: 'firestore-lite-stub' } as unknown as Firestore;
  }
} catch (error: any) {
  console.error("Error during getAuth() or getFirestore(). This typically means the Firebase app instance ('app') was not properly initialized, or the required services (Authentication, Firestore) are not enabled or correctly set up in your Firebase project console. Error details:", error, "Error code:", error?.code);
  auth = { currentUser: null, onAuthStateChanged: () => (() => {}), signOut: async () => {}, signInWithPopup: async () => { throw new Error("Firebase Auth not initialized due to earlier error"); } } as unknown as Auth;
  db = { type: 'firestore-lite-stub-error' } as unknown as Firestore;
}

export { app, auth, db, googleProvider };
