// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id",
}

const isConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// Initialize Firebase only if API Key is configured to avoid crashes,
// otherwise provide mock/null structures for safe offline usage.
let app
let auth: ReturnType<typeof getAuth>
let db: ReturnType<typeof getFirestore>
const googleProvider = new GoogleAuthProvider()

if (isConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  // If not configured, we'll run completely in Demo Local Storage Mode
  console.warn("Firebase not configured. Running in local Demo Mode. Add Firebase keys in .env.local to activate cloud synchronization.")
  app = null
  auth = null as any
  db = null as any
}

export { app, auth, db, googleProvider, isConfigured }
