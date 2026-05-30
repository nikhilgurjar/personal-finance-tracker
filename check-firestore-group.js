import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse env file manually
const envPath = path.resolve(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1].trim()] = value;
  }
});

const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
const clientEmail = env.FIREBASE_ADMIN_CLIENT_EMAIL;
const projectId = env.FIREBASE_ADMIN_PROJECT_ID;

console.log("Initializing Firebase Admin...");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = admin.firestore();

async function check() {
  try {
    const subCols = ["accounts", "expenses", "goals", "savings", "debts", "apps", "providers"];
    for (const col of subCols) {
      console.log(`Running collection group query for '${col}'...`);
      const snap = await db.collectionGroup(col).get();
      console.log(`Found ${snap.size} documents in group '${col}'.`);
      snap.forEach(doc => {
        console.log(` - Path: ${doc.ref.path}`);
        console.log(`   Data:`, doc.data());
      });
    }
  } catch (err) {
    console.error("Collection group query failed:", err);
  }
  process.exit(0);
}

check();
