'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all required env variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error('Missing Firebase environment variables. Check your .env.local file.');
}

// Initialize Firebase - use a singleton pattern to avoid multiple initializations
let firebaseApp: FirebaseApp;
let firebaseAuth: Auth;
let firebaseDb: Firestore;

try {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    console.log('Firebase initialized for the first time');
  } else {
    firebaseApp = getApps()[0];
    console.log('Using existing Firebase app');
  }
  
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  console.log('Firebase auth and Firestore initialized');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Export the initialized services
export const app = firebaseApp!;
export const auth = firebaseAuth!;
export const db = firebaseDb!; 