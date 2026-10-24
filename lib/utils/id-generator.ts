let fallbackCounter = 0;

export function generateId(prefix: string): string {
  const cryptoObj = typeof crypto !== "undefined" ? crypto : (typeof window !== "undefined" ? window.crypto : null);

  if (cryptoObj) {
    if (typeof cryptoObj.randomUUID === "function") {
      try {
        return `${prefix}_${cryptoObj.randomUUID().split("-")[0]}`;
      } catch {
        // Fallback if randomUUID throws (e.g. non-secure context)
      }
    }

    if (typeof cryptoObj.getRandomValues === "function") {
      const array = new Uint32Array(1);
      cryptoObj.getRandomValues(array);
      return `${prefix}_${Date.now().toString(36)}_${array[0].toString(36)}`;
    }
  }

  // Final fallback: Use a sequential counter combined with timestamp to eliminate predictable PRNG vulnerability.
  fallbackCounter = (fallbackCounter + 1) % 1000000;
  return `${prefix}_${Date.now().toString(36)}_${fallbackCounter.toString(36)}`;
}
