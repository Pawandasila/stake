
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined = undefined;
let authInstance: Auth;
let dbInstance: Firestore;
const googleProvider = new GoogleAuthProvider();

// Raw values from environment variables
const rawEnvConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (typeof window !== 'undefined') {
  console.log('%c[VictoryVision Firebase Debug] Raw environment variables for Firebase:', 'color: orange; font-weight: bold;', rawEnvConfig);
}

const firebaseConfig = { ...rawEnvConfig }; // Use a copy

if (typeof window !== 'undefined') {
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  let configIsValid = true;
  const missingOrEmptyKeys: string[] = [];

  for (const key of essentialKeys) {
    const value = firebaseConfig[key];
    if (typeof value !== 'string' || value.trim() === '') {
      configIsValid = false;
      missingOrEmptyKeys.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z0-9])/g, '_$1').substring(1).toUpperCase()}`);
    }
  }
  
  // projectId is critically important
  if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === '') {
    configIsValid = false;
    if (!missingOrEmptyKeys.includes('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) {
      missingOrEmptyKeys.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
  }


  if (!configIsValid) {
    console.error(
      `%c[VictoryVision Firebase Debug] FIREBASE CONFIGURATION ERROR:
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
      firebaseConfig // Log the raw config from env vars here
    );
  }

  if (getApps().length === 0) {
    if (configIsValid) {
      try {
        const configToInitialize: Record<string, string> = {};
        let key: keyof typeof firebaseConfig;
        for (key in firebaseConfig) {
          if (firebaseConfig[key] && typeof firebaseConfig[key] === 'string' && (firebaseConfig[key] as string).trim() !== '') {
            configToInitialize[key] = firebaseConfig[key]!;
          }
        }
        
        console.log('%c[VictoryVision Firebase Debug] Config object being passed to initializeApp:', 'color: blue; font-weight: bold;', configToInitialize);

        let allEssentialInitialized = true;
        for (const eKey of essentialKeys) {
            if (!configToInitialize[eKey]) {
                allEssentialInitialized = false;
                 // missingOrEmptyKeys was for raw env check, re-evaluate for filtered config
            }
        }
         if (!configToInitialize.projectId) { // Explicitly check projectId again for the filtered object
            allEssentialInitialized = false;
         }
        
        if (!allEssentialInitialized) {
             console.error(`%c[VictoryVision Firebase Debug] Firebase Initialization Error: Not all essential config keys have values in the object passed to initializeApp. Filtered config:`, 'color: red; font-weight: bold;', configToInitialize);
        } else {
            app = initializeApp(configToInitialize as import('firebase/app').FirebaseOptions);
            console.log("%c[VictoryVision Firebase Debug] Firebase app initialized successfully with config:", "color: green;", configToInitialize);
        }
      } catch (e: any) {
        console.error("%c[VictoryVision Firebase Debug] Firebase SDK initializeApp call FAILED. This often follows a configuration error or an issue with the Firebase project setup itself. Double-check API keys, project ID, and ensure Authentication service is enabled in your Firebase console. Error:", "color: red; font-weight: bold;", e, "Config attempted:", firebaseConfig);
      }
    } else {
      console.warn("%c[VictoryVision Firebase Debug] Firebase app initialization SKIPPED due to invalid or missing configuration. See error logged above.", "color: orange; font-weight: bold;");
    }
  } else {
    app = getApp();
    // console.log("%c[VictoryVision Firebase Debug] Firebase app already initialized. Using existing app.", "color: orange;");
  }
}

try {
  if (app && app.name && typeof app.options?.apiKey === 'string' && app.options.apiKey.length > 0) { // Check if app is a valid FirebaseApp instance with an API key
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  } else {
    if (typeof window !== 'undefined') {
        console.error("%c[VictoryVision Firebase Debug] Firebase Auth and Firestore CANNOT be initialized because the Firebase app instance is NOT valid or missing critical config. This usually follows a configuration error (check logs above) or services not being enabled in Firebase console. Ensure NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env file and that the Next.js server has been FULLY RESTARTED. Current app object:", "color: red; font-weight: bold;", app);
    }
    // Provide non-functional stubs to prevent app crashes if auth/db are used before initialization
    authInstance = { currentUser: null, onAuthStateChanged: () => (() => {}), signOut: async () => {}, signInWithPopup: async () => { throw new Error("Firebase Auth not initialized"); }, createUserWithEmailAndPassword: async () => { throw new Error("Firebase Auth not initialized"); }, signInWithEmailAndPassword: async () => { throw new Error("Firebase Auth not initialized"); }} as unknown as Auth;
    dbInstance = { type: 'firestore-lite-stub' } as unknown as Firestore;
  }
} catch (error: any) {
  console.error("%c[VictoryVision Firebase Debug] Error during getAuth() or getFirestore(). This typically means the Firebase app instance ('app') was not properly initialized, or the required services (Authentication, Firestore) are not enabled or correctly set up in your Firebase project console. Error details:", "color: red; font-weight: bold;", error, "Error code:", error?.code);
  authInstance = { currentUser: null, onAuthStateChanged: () => (() => {}), signOut: async () => {}, signInWithPopup: async () => { throw new Error("Firebase Auth not initialized due to earlier error"); }, createUserWithEmailAndPassword: async () => { throw new Error("Firebase Auth not initialized"); }, signInWithEmailAndPassword: async () => { throw new Error("Firebase Auth not initialized"); }} as unknown as Auth;
  dbInstance = { type: 'firestore-lite-stub-error' } as unknown as Firestore;
}

export { app, authInstance as auth, dbInstance as db, googleProvider };
    