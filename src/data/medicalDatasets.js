/**
 * MedSafe — Clinical & Regulatory Datasets
 * Based on CDSCO Guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016
 */

/**
 * Text normalisation helper
 * Converts to lowercase, replaces hyphens and slashes with spaces,
 * strips non-alphanumeric punctuation, and collapses multiple spaces.
 *
 * @param {string} input - Raw text input
 * @returns {string} - Clean normalized text
 */
export function normalizeDrugText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/[-/]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper to compute an ISO date string (YYYY-MM-DD) offset by N days from today in local time.
 * Used for dynamic anchor dates in demo and test data.
 *
 * @param {number} daysOffset - Days to add (positive) or subtract (negative) from today
 * @returns {string} - YYYY-MM-DD format
 */
export function getOffsetDate(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * CDSCO Guidance WI/01/DCC-P-25 (Annexure D Flush List) + Indian Clinical Standard (Pethidine)
 * 15 active pharmaceutical roots strictly matched via whole-word boundary regex.
 */
export const CDSCO_FLUSH_ROOTS = [
  "fentanyl",
  "morphine",
  "buprenorphine",
  "methylphenidate",
  "meperidine",
  "pethidine",
  "diazepam",
  "hydromorphone",
  "methadone",
  "hydrocodone",
  "tapentadol",
  "oxymorphone",
  "oxycodone",
  "sodium oxybate",
  "tramadol",
];

/**
 * Antimicrobial Resistance (AMR) Aware Antibiotic Roots List
 * Compiled for MedSafe to prevent household sink/toilet flushing of antibacterials,
 * aligned with CDSCO guidance WI/01/DCC-P-25 (Section 2: Background - AMR prevention).
 */
export const ANTIBIOTIC_ROOTS = [
  "amoxicillin",
  "amoxycillin",
  "clavulanate",
  "clavulanic",
  "ampicillin",
  "cloxacillin",
  "penicillin",
  "azithromycin",
  "clarithromycin",
  "erythromycin",
  "ciprofloxacin",
  "norfloxacin",
  "ofloxacin",
  "levofloxacin",
  "moxifloxacin",
  "cefixime",
  "cefpodoxime",
  "cefuroxime",
  "cephalexin",
  "ceftriaxone",
  "cefdinir",
  "cefadroxil",
  "cefoperazone",
  "doxycycline",
  "tetracycline",
  "minocycline",
  "metronidazole",
  "tinidazole",
  "ornidazole",
  "rifampicin",
  "isoniazid",
  "cotrimoxazole",
  "co trimoxazole",
  "trimethoprim",
  "sulfamethoxazole",
  "linezolid",
  "clindamycin",
  "nitrofurantoin",
  "gentamicin",
  "amikacin",
];

/**
 * Offline Household Medicine Dictionary
 * Verified Indian additions (Dolo, Crocin, Tramazac, Tidigesic, Augmentin, Cifran, Taxim-O, etc.)
 * Dynamically reference OFFLINE_DRUG_DICTIONARY.length in UI/logic.
 */
export const OFFLINE_DRUG_DICTIONARY = [
  { brandName: "Dolo 650", genericName: "Paracetamol 650mg", category: "Tablet" },
  { brandName: "Crocin Advance", genericName: "Paracetamol 500mg", category: "Tablet" },
  { brandName: "Calpol 250 Pediatric", genericName: "Paracetamol Oral Suspension", category: "Syrup" },
  { brandName: "Ultracet", genericName: "Tramadol 37.5mg & Paracetamol 325mg", category: "Tablet" },
  { brandName: "Tramazac", genericName: "Tramadol Hydrochloride 50mg", category: "Tablet" },
  { brandName: "Contramal 50", genericName: "Tramadol Hydrochloride 50mg", category: "Tablet" },
  { brandName: "Tidigesic", genericName: "Buprenorphine Hydrochloride 0.2mg", category: "Tablet" },
  { brandName: "Valium 5", genericName: "Diazepam 5mg", category: "Tablet" },
  { brandName: "Inspiral 10", genericName: "Methylphenidate Hydrochloride 10mg", category: "Tablet" },
  { brandName: "OxyContin 10mg", genericName: "Oxycodone Hydrochloride 10mg", category: "Tablet" },
  { brandName: "Augmentin 625 Duo", genericName: "Amoxicillin 500mg & Potassium Clavulanate 125mg", category: "Tablet" },
  { brandName: "Augmentin Duo Oral Suspension", genericName: "Amoxicillin & Clavulanate Reconstituted Syrup", category: "Reconstituted Syrup" },
  { brandName: "Azithral 500", genericName: "Azithromycin 500mg", category: "Tablet" },
  { brandName: "Cifran 500", genericName: "Ciprofloxacin Hydrochloride 500mg", category: "Tablet" },
  { brandName: "Taxim-O 200", genericName: "Cefixime 200mg", category: "Tablet" },
  { brandName: "Monocef 1g Vial", genericName: "Ceftriaxone Sodium Injectable", category: "Syringe" },
  { brandName: "Norflox-400", genericName: "Norfloxacin 400mg", category: "Tablet" },
  { brandName: "Flagyl 400", genericName: "Metronidazole 400mg", category: "Tablet" },
  { brandName: "R-Cinex 600", genericName: "Rifampicin & Isoniazid", category: "Tablet" },
  { brandName: "Septran DS", genericName: "Co-trimoxazole (Trimethoprim & Sulfamethoxazole)", category: "Tablet" },
  { brandName: "Pan-D", genericName: "Pantoprazole 40mg & Domperidone 30mg", category: "Tablet" },
  { brandName: "Pan 40", genericName: "Pantoprazole 40mg", category: "Tablet" },
  { brandName: "Combiflam", genericName: "Ibuprofen 400mg & Paracetamol 325mg", category: "Tablet" },
  { brandName: "Allegra 120mg", genericName: "Fexofenadine Hydrochloride 120mg", category: "Tablet" },
  { brandName: "Montair LC", genericName: "Montelukast 10mg & Levocetirizine 5mg", category: "Tablet" },
  { brandName: "Asthalin HFA Inhaler", genericName: "Salbutamol Pressurized Metered-Dose Inhaler", category: "Pressurized Inhaler" },
  { brandName: "Foracort 200 Rotacaps", genericName: "Formoterol & Budesonide Dry Powder Capsules", category: "Dry Powder Inhaler" },
  { brandName: "Lantus SoloStar Pen", genericName: "Insulin Glargine Injection Pen", category: "Insulin Pen" },
  { brandName: "Refresh Tears", genericName: "Carboxymethylcellulose Eye Drops 0.5%", category: "Drops" },
  { brandName: "Ciplox Eye/Ear Drops", genericName: "Ciprofloxacin Ophthalmic Solution 0.3%", category: "Drops" },
  { brandName: "Betadine Ointment", genericName: "Povidone-Iodine Topical 10%", category: "Topical" },
  { brandName: "Volini Gel", genericName: "Diclofenac Diethylamine Topical Gel", category: "Topical" },
  { brandName: "Shelcal 500", genericName: "Calcium 500mg & Vitamin D3 250 IU", category: "Tablet" },
  { brandName: "Benadryl Cough Formula", genericName: "Diphenhydramine Oral Syrup", category: "Syrup" },
  { brandName: "Bravecto Chewable", genericName: "Fluralaner 250mg Veterinary Chew", category: "Tablet" },
];

/**
 * Recognized Non-Opioid / Non-Antibiotic Safe Common Salts
 * Used alongside OFFLINE_DRUG_DICTIONARY, CDSCO_FLUSH_ROOTS, and ANTIBIOTIC_ROOTS
 * so recognized household generics are identified cleanly.
 */
export const KNOWN_COMMON_SALTS = [
  "paracetamol",
  "acetaminophen",
  "ibuprofen",
  "diclofenac",
  "aceclofenac",
  "naproxen",
  "aspirin",
  "pantoprazole",
  "omeprazole",
  "rabeprazole",
  "esomeprazole",
  "domperidone",
  "ondansetron",
  "fexofenadine",
  "cetirizine",
  "levocetirizine",
  "loratadine",
  "montelukast",
  "salbutamol",
  "albuterol",
  "formoterol",
  "budesonide",
  "fluticasone",
  "insulin",
  "metformin",
  "glimepiride",
  "amlodipine",
  "telmisartan",
  "losartan",
  "atorvastatin",
  "rosuvastatin",
  "levothyroxine",
  "thyroxine",
  "carboxymethylcellulose",
  "povidone",
  "iodine",
  "calcium",
  "cholecalciferol",
  "vitamin",
  "zinc",
  "diphenhydramine",
  "dextromethorphan",
  "ambroxol",
  "guaifenesin",
  "fluralaner",
  "apomorphine",
  "loperamide",
  "ors",
  "electral",
];

/**
 * Factory function to generate fresh DEMO_CABINET_DATA records
 * dynamically anchored to the current date.
 */
export function getDemoCabinetData() {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "demo_med_1",
      brandName: "Tramazac",
      genericName: "Tramadol Hydrochloride 50mg",
      category: "Tablet",
      familyMember: "Seniors",
      storageLocation: "Bedroom Drawer",
      quantity: "10 Tablets",
      openedDate: "",
      expiryDate: getOffsetDate(-14),
      notes: "Prescribed for chronic pain. CDSCO Annexure D Flush List item.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_2",
      brandName: "Taxim-O 200",
      genericName: "Cefixime 200mg",
      category: "Tablet",
      familyMember: "Adults",
      storageLocation: "First-Aid Box",
      quantity: "4 Tablets",
      openedDate: "",
      expiryDate: getOffsetDate(-5),
      notes: "Antibiotic course completed. AMR guard active — do not flush.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_3",
      brandName: "Lantus SoloStar Pen",
      genericName: "Insulin Glargine Injection Pen",
      category: "Insulin Pen",
      familyMember: "Seniors",
      storageLocation: "Fridge Door",
      quantity: "1 Pen (3ml)",
      openedDate: getOffsetDate(-40),
      expiryDate: getOffsetDate(120),
      notes: "Opened 40 days ago (max 28d in-use limit). Biohazard sharps protocol required.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_4",
      brandName: "Augmentin Duo Syrup",
      genericName: "Amoxicillin & Clavulanate Oral Susp.",
      category: "Reconstituted Syrup",
      familyMember: "Kids",
      storageLocation: "Fridge Door",
      quantity: "30 ml",
      openedDate: getOffsetDate(-18),
      expiryDate: getOffsetDate(60),
      notes: "Reconstituted pediatric syrup. Exceeds 14-day limit post mixing with sterile water.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_5",
      brandName: "Asthalin HFA Inhaler",
      genericName: "Salbutamol Pressurized Inhaler",
      category: "Pressurized Inhaler",
      familyMember: "Adults",
      storageLocation: "Bedroom Drawer",
      quantity: "1 Inhaler (200 Puffs)",
      openedDate: "",
      expiryDate: getOffsetDate(12),
      notes: "Pressurized canister aerosol. Explosion and puncture hazard protocol.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_6",
      brandName: "Calpol 250 Pediatric",
      genericName: "Paracetamol Oral Suspension",
      category: "Syrup",
      familyMember: "Kids",
      storageLocation: "First-Aid Box",
      quantity: "60 ml",
      openedDate: "",
      expiryDate: getOffsetDate(0),
      notes: "Expires today — last day of validity.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_7",
      brandName: "Dolo 650",
      genericName: "Paracetamol 650mg",
      category: "Tablet",
      familyMember: "Adults",
      storageLocation: "First-Aid Box",
      quantity: "15 Tablets",
      openedDate: "",
      expiryDate: getOffsetDate(180),
      notes: "Common fever/pain relief. Safe shelf-life remaining.",
      createdAt: nowIso,
    },
    {
      id: "demo_med_8",
      brandName: "Bravecto Chewable",
      genericName: "Fluralaner 250mg Veterinary Chew",
      category: "Tablet",
      familyMember: "Pets",
      storageLocation: "Top Shelf",
      quantity: "1 Chewable",
      openedDate: "",
      expiryDate: getOffsetDate(240),
      notes: "Pet tick/flea prevention. High shelf storage out of reach.",
      createdAt: nowIso,
    },
  ];
}

/**
 * Pre-Built Judge Demo Dataset (Section 7)
 * 8 deterministic demo medicines configured with exact 11-field record layout.
 */
export const DEMO_CABINET_DATA = getDemoCabinetData();
