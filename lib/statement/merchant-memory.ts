import { db, auth } from "@/lib/firebase";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";

export interface MerchantMemoryDoc {
  key: string;                 // Normalized key: "pratibha_food_services"
  displayName: string;         // "Pratibha Foods"
  upiIds: string[];            // ["xyz@ybl.com"]
  nameVariants: string[];      // ["PRATIBHA FOOD SERVICES"]
  category: string;            // "food_dining"
  lastDescription: string;     // "Lunch - thali"
  frequency: number;           
  lastSeen: string;            
}

export async function fetchUserMerchantMemory(): Promise<Record<string, MerchantMemoryDoc>> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  const memoryRef = collection(db, "users", auth.currentUser.uid, "merchantMemory");
  const snapshot = await getDocs(memoryRef);
  
  const memoryMap: Record<string, MerchantMemoryDoc> = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as MerchantMemoryDoc;
    memoryMap[data.key] = data;
  });
  
  return memoryMap;
}

export async function saveMerchantMemories(memories: MerchantMemoryDoc[]): Promise<void> {
  if (!auth.currentUser) throw new Error("Not authenticated");
  if (memories.length === 0) return;

  const batch = writeBatch(db);
  const uid = auth.currentUser.uid;
  
  memories.forEach((mem) => {
    const docRef = doc(db, "users", uid, "merchantMemory", mem.key);
    batch.set(docRef, mem, { merge: true });
  });

  await batch.commit();
}

export function generateMerchantKey(rawName: string): string {
  return rawName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
