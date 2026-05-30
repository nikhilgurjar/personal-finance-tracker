// lib/firebaseAdmin.ts
import admin from "firebase-admin"

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID

  if (privateKey && clientEmail && projectId) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } else {
    console.warn("Firebase Admin SDK credentials missing in environment variables.")
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null
export { admin }
