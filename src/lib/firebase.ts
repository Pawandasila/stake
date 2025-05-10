// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// This structure is CRITICAL. Do NOT use process.env directly here.
// It will be populated by Next.js from your .env.local or .env file.
const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // This is optional
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth;
let db: Firestore;
const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  // Perform checks and initialize only on the client-side
  const essentialKeys: (keyof typeof firebaseConfigValues)[] = ['apiKey', 'authDomain', 'projectId', 'appId'];
  let configIsValid = true;
  const missingOrEmptyKeys: string[] = [];

  for (const key of essentialKeys) {
    const value = firebaseConfigValues[key];
    if (typeof value !== 'string' || value.trim() === '') {
      configIsValid = false;
      missingOrEmptyKeys.push(key);
    }
  }

  if (!configIsValid) {
    console.error(
      `%cFIREBASE CONFIGURATION ERROR:
%cThe following essential Firebase environment variables are missing, empty, or not strings:
%c${missingOrEmptyKeys.join(', ')}

%cPlease check the following:
1. Your project root contains a '.env' or '.env.local' file.
2. Inside this file, variables are defined like: NEXT_PUBLIC_FIREBASE_API_KEY="your_actual_key_here"
3. The variable names EXACTLY match (e.g., NEXT_PUBLIC_FIREBASE_API_KEY). Ensure they start with NEXT_PUBLIC_.
4. The values assigned are not empty (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID="").
5. You have FULLY STOPPED and RESTARTED your Next.js development server (e.g., Ctrl+C, then 'npm run dev' or 'yarn dev'). This includes deleting the .next folder.

Current configuration object that was attempted (values might be 'undefined' if not loaded from .env):`,
      'font-weight: bold; color: red; font-size: 16px;',
      'color: red;',
      'font-weight: bold; color: red;',
      'color: black;',
      firebaseConfigValues // Log the actual values being read (or not read)
    );
  }

  if (getApps().length === 0) {
    if (configIsValid) {
      try {
        // Construct the config object for initializeApp carefully, ensuring optional fields are handled.
        const configToInitialize: Record<string, string | undefined> = {};
        (Object.keys(firebaseConfigValues) as Array<keyof typeof firebaseConfigValues>).forEach(key => {
          if (firebaseConfigValues[key]) { // Only add if value is present
            configToInitialize[key] = firebaseConfigValues[key];
          }
        });
        app = initializeApp(configToInitialize as import('firebase/app').FirebaseOptions);

      } catch (e) {
        console.error("Firebase SDK initialization failed. This often follows a configuration error or an issue with the Firebase project setup itself. Double-check API keys, project ID, and ensure Authentication service is enabled in your Firebase console.", e);
        // app will remain undefined
      }
    } else {
      console.warn("Firebase app initialization SKIPPED due to invalid or missing configuration. See error above.");
    }
  } else {
    app = getApp();
  }
}


try {
  if (app && app.name) { 
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    if (typeof window !== 'undefined') { 
        console.error("Firebase Auth and Firestore cannot be initialized because the Firebase app instance is not valid. This usually follows a configuration error reported above. Check that essential NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env file and that the server has been restarted.");
    }
    auth = {} as Auth; // Provide non-functional stubs
    db = {} as Firestore; // Provide non-functional stubs
  }
} catch (error: any) {
  // Catching the specific "auth/configuration-not-found" error here might be too late,
  // as it's often thrown synchronously by getAuth() if the app config is bad.
  console.error("Error initializing Firebase services (Auth, Firestore). This can happen if the app configuration is invalid (e.g., wrong API key for project ID) or if the Authentication service isn't properly set up in your Firebase console. Error details:", error, "Error code:", error?.code);
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db, googleProvider };
