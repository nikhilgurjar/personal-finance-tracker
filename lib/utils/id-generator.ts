export function generateId(prefix: string): string {
  // Use crypto.randomUUID if available (secure context), else fallback to Math.random
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID().split("-")[0]}`;
  }
  return `${prefix}_${Date.now().toString(36) + Math.random().toString(36).substring(2, 7)}`;
}
