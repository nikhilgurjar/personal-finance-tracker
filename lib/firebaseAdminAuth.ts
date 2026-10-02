import { admin } from "@/lib/firebaseAdmin"

export class FirebaseAuthenticationError extends Error {}

export async function authenticateFirebaseRequest(request: Request): Promise<string> {
  const authorization = request.headers.get("authorization")
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new FirebaseAuthenticationError("A Firebase sign-in is required.")
  if (!admin.apps.length) throw new Error("Firebase Admin is not configured.")

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    return decodedToken.uid
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined
    if (typeof code === "string" && code.startsWith("auth/")) {
      throw new FirebaseAuthenticationError("The Firebase sign-in token is invalid or expired.")
    }
    throw error
  }
}
