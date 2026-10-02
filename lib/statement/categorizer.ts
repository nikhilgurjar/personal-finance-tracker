import { NormalizedTransaction } from "./types";
import { MerchantMemoryDoc, generateMerchantKey } from "./merchant-memory";

const KEYWORD_DICTIONARY: Record<string, string> = {
  // Food & Dining
  swiggy: "food_dining",
  zomato: "food_dining",
  dominos: "food_dining",
  mcdonalds: "food_dining",
  kfc: "food_dining",
  starbucks: "food_dining",
  burger_king: "food_dining",
  "burger king": "food_dining",
  haldiram: "food_dining",
  chai_point: "food_dining",
  "chai point": "food_dining",
  chaayos: "food_dining",
  subway: "food_dining",
  eatclub: "food_dining",
  pizzahut: "food_dining",
  "pizza hut": "food_dining",
  behrouz: "food_dining",
  faasos: "food_dining",
  barbeque: "food_dining",
  cafe: "food_dining",
  restaurant: "food_dining",
  bakery: "food_dining",
  sweets: "food_dining",
  bhojanalaya: "food_dining",
  mess: "food_dining",
  canteen: "food_dining",

  // Groceries & Daily Needs
  dmart: "groceries",
  blinkit: "groceries",
  zepto: "groceries",
  instamart: "groceries",
  bigbasket: "groceries",
  bbdaily: "groceries",
  swiggy_instamart: "groceries",
  nature_basket: "groceries",
  "nature's basket": "groceries",
  reliance_fresh: "groceries",
  "reliance fresh": "groceries",
  "reliance smart": "groceries",
  more_retail: "groceries",
  spencer: "groceries",
  supermarket: "groceries",
  kirana: "groceries",
  grocery: "groceries",
  vegetable: "groceries",
  dairy: "groceries",
  milk: "groceries",

  // Transport & Fuel
  uber: "transport",
  ola: "transport",
  rapido: "transport",
  namma_yatri: "transport",
  "namma yatri": "transport",
  petrol: "transport",
  fuel: "transport",
  indian_oil: "transport",
  indianoil: "transport",
  ioc: "transport",
  bpcl: "transport",
  bharat_petroleum: "transport",
  hpcl: "transport",
  hindustan_petroleum: "transport",
  shell: "transport",
  fastag: "transport",
  toll: "transport",
  metro: "transport",
  parking: "transport",

  // Travel
  irctc: "travel",
  makemytrip: "travel",
  goibibo: "travel",
  easemytrip: "travel",
  yatra: "travel",
  cleartrip: "travel",
  indigo: "travel",
  "air india": "travel",
  airindia: "travel",
  spicejet: "travel",
  akasa: "travel",
  redbus: "travel",
  abhibus: "travel",
  hotel: "travel",
  resort: "travel",
  airbnb: "travel",

  // Shopping
  amazon: "shopping",
  flipkart: "shopping",
  myntra: "shopping",
  ajio: "shopping",
  nykaa: "shopping",
  snitch: "shopping",
  zara: "shopping",
  "h&m": "shopping",
  hnm: "shopping",
  meesho: "shopping",
  tata_cliq: "shopping",
  tatacliq: "shopping",
  croma: "shopping",
  "reliance digital": "shopping",
  reliancedigital: "shopping",
  "vijay sales": "shopping",
  decathlon: "shopping",
  uniqlo: "shopping",
  westside: "shopping",
  pantaloons: "shopping",
  lifestyle: "shopping",
  shoppers_stop: "shopping",
  max_fashion: "shopping",
  ikea: "shopping",
  lenskart: "shopping",

  // Utilities & Bills
  electricity: "utilities",
  bescom: "utilities",
  mahavitaran: "utilities",
  "tata power": "utilities",
  tatapower: "utilities",
  "adani electricity": "utilities",
  adanipower: "utilities",
  torrent_power: "utilities",
  cesc: "utilities",
  uppcl: "utilities",
  igl: "utilities",
  mgl: "utilities",
  water_board: "utilities",
  piped_gas: "utilities",
  cylinder: "utilities",
  hp_gas: "utilities",
  indane: "utilities",
  bharat_gas: "utilities",

  // Mobile & Internet
  jio: "mobile_internet",
  airtel: "mobile_internet",
  vi: "mobile_internet",
  vodafone: "mobile_internet",
  idea: "mobile_internet",
  bsnl: "mobile_internet",
  broadband: "mobile_internet",
  "act fibernet": "mobile_internet",
  actfibernet: "mobile_internet",
  hathway: "mobile_internet",
  recharge: "mobile_internet",

  // Subscriptions & Entertainment
  netflix: "subscriptions",
  spotify: "subscriptions",
  hotstar: "subscriptions",
  disney: "subscriptions",
  youtube: "subscriptions",
  prime: "subscriptions",
  amazon_prime: "subscriptions",
  apple: "subscriptions",
  google_play: "subscriptions",
  openai: "subscriptions",
  chatgpt: "subscriptions",
  notion: "subscriptions",
  github: "subscriptions",
  sonyliv: "subscriptions",
  zee5: "subscriptions",
  bookmyshow: "entertainment",
  pvr: "entertainment",
  inox: "entertainment",
  cinepolis: "entertainment",
  cinema: "entertainment",
  theatre: "entertainment",
  gaming: "entertainment",
  playstation: "entertainment",
  steam: "entertainment",

  // Health & Medical
  apollo: "health",
  pharmeasy: "health",
  netmeds: "health",
  "1mg": "health",
  tata1mg: "health",
  medplus: "health",
  practo: "health",
  hospital: "health",
  clinic: "health",
  pharmacy: "health",
  chemist: "health",
  diagnostic: "health",
  pathology: "health",
  dental: "health",
  optical: "health",
};

export function enrichTransactions(
  transactions: NormalizedTransaction[],
  memoryMap: Record<string, MerchantMemoryDoc>
): NormalizedTransaction[] {
  const memoryList = Object.values(memoryMap);

  return transactions.map((t) => {
    // 1. Try to match by UPI ID (Strongest Match)
    if (t.upiId) {
      const matchByUpi = memoryList.find((m) => m.upiIds.includes(t.upiId!));
      if (matchByUpi) {
        return applyMemoryMatch(t, matchByUpi, 1.0);
      }
    }

    // 2. Try to match by exact generated key
    const merchantKey = generateMerchantKey(t.rawDescription);
    if (memoryMap[merchantKey]) {
      return applyMemoryMatch(t, memoryMap[merchantKey], 0.95);
    }

    // 3. Try to match by name variants
    const matchByVariant = memoryList.find((m) => 
      m.nameVariants.some(v => v.toLowerCase() === t.rawDescription.toLowerCase())
    );
    if (matchByVariant) {
      return applyMemoryMatch(t, matchByVariant, 0.9);
    }

    // 4. Try keyword dictionary fallback
    const descLower = t.rawDescription.toLowerCase();
    for (const [keyword, category] of Object.entries(KEYWORD_DICTIONARY)) {
      if (descLower.includes(keyword)) {
        t.category = category;
        // Capitalize the first letter for a nicer name
        t.userLabel = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        t.confidence = 0.6;
        return t;
      }
    }

    // No match
    t.category = null;
    t.userLabel = t.rawDescription.substring(0, 30); // fallback name
    t.confidence = 0;
    return t;
  });
}

function applyMemoryMatch(
  t: NormalizedTransaction, 
  mem: MerchantMemoryDoc, 
  confidence: number
): NormalizedTransaction {
  t.category = mem.category;
  t.userLabel = mem.displayName;
  t.userDescription = mem.lastDescription;
  t.confidence = confidence;
  t.merchantName = mem.displayName;
  return t;
}
