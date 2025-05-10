
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfigClient: { [key: string]: string | undefined } = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId is initially omitted
};

// Conditionally add measurementId if it exists and is not an empty string
if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID.trim() !== "") {
  firebaseConfigClient.measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
}

// Client-side check for essential Firebase config keys
if (typeof window !== 'undefined') { // Ensures this only runs on the client
  const essentialKeys = {
    apiKey: firebaseConfigClient.apiKey,
    authDomain: firebaseConfigClient.authDomain,
    projectId: firebaseConfigClient.projectId,
  };
  const missingKeys = Object.entries(essentialKeys)
    .filter(([, value]) => !value) // Find keys with falsy values (undefined, empty string)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    console.error(
      `Critical Firebase configuration error: The following essential Firebase config keys are missing or empty: ${missingKeys.join(', ')}. 
      Please check your .env file, ensure the NEXT_PUBLIC_ prefixes are correct, and that the values are not empty. 
      You MUST restart your development server after changes to .env files.`,
      'Current config object:', firebaseConfigClient
    );
    // Optionally, you could throw an error here to halt execution if Firebase is absolutely critical
    // throw new Error(`Firebase configuration is incomplete: ${missingKeys.join(', ')} missing. App cannot start.`);
  }
}

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  // Type assertion to FirebaseOptions, assuming firebaseConfigClient matches the structure
  app = initializeApp(firebaseConfigClient as import('firebase/app').FirebaseOptions);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
