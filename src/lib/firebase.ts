// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth;
let db: Firestore;
const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  // Perform checks and initialize only on the client-side
  const essentialKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId'];
  let configIsValid = true;
  const missingOrEmptyKeys: string[] = [];

  for (const key of essentialKeys) {
    const value = firebaseConfig[key];
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
3. The variable names EXACTLY match (e.g., NEXT_PUBLIC_FIREBASE_API_KEY).
4. The values assigned are not empty (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID="").
5. You have FULLY STOPPED and RESTARTED your Next.js development server (e.g., Ctrl+C, then 'npm run dev' or 'yarn dev').

Current configuration object that was attempted (values might be 'undefined' if not loaded):`,
      'font-weight: bold; color: red; font-size: 16px;',
      'color: red;',
      'font-weight: bold; color: red;',
      'color: black;',
      firebaseConfig
    );
    // To make it very obvious on the page during development that there's a problem:
    if (document.body) {
        // document.body.innerHTML = `<div style="font-family: sans-serif; padding: 20px; background-color: #fff0f0; border: 2px solid red; color: #333; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999;"><h1>Firebase Configuration Error</h1><p>Essential Firebase configuration is missing or invalid. The application cannot start correctly. <strong>Check the browser console (F12) for detailed error messages and instructions.</strong></p><p style="font-weight: bold;">Missing/Empty Keys: ${missingOrEmptyKeys.join(', ')}</p></div>`;
    }
  }

  if (getApps().length === 0) {
    if (configIsValid) {
      try {
        app = initializeApp(firebaseConfig as import('firebase/app').FirebaseOptions);
      } catch (e) {
        console.error("Firebase SDK initialization failed:", e);
        // app will remain undefined
      }
    } else {
      console.warn("Firebase app initialization skipped due to invalid or missing configuration.");
    }
  } else {
    app = getApp();
  }
}
// No server-side initialization for client Firebase config here.
// If you need Firebase Admin SDK on the server, it's a separate setup.

// Initialize Auth and Firestore, handling potential errors if 'app' is not initialized
try {
  if (app && app.name) { // Check if app is a valid initialized FirebaseApp
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    if (typeof window !== 'undefined') { // Log this error only on client
        console.error("Firebase Auth and Firestore cannot be initialized because the Firebase app instance is not valid. This usually follows a configuration error reported above.");
    }
    // Provide non-functional stubs to prevent immediate crashes on access; errors will surface when these stubs are used.
    auth = {} as Auth;
    db = {} as Firestore;
  }
} catch (error) {
  console.error("Error initializing Firebase services (Auth, Firestore), possibly due to an uninitialized app:", error);
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db, googleProvider };
