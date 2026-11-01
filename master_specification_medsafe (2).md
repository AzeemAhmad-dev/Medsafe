# MASTER SPECIFICATION: MedSafe — Household Medicine Expiry & Safe Disposal Portal (based on CDSCO guidance WI/01/DCC-P-25)

## 1. Problem Statement & Core Objectives

### 1.1 Official Problem Statement
**Medicine Expiry Tracker:** Build a web portal where families can log their home medicines with names and expiry dates and get visual alerts when medicines are nearing expiry. Includes a safe disposal guide to prevent misuse of expired medicines — promoting household health safety in a simple, accessible way.

### 1.2 Root Problems Addressed
1. **Unnoticed Expiry & Sub-Potent / Contaminated Dosing:** Households keep dozens of OTC and prescription medicines scattered across drawers. Expired drugs may lose therapeutic potency (particularly critical for antibiotics, nitroglycerin, and insulin), while multi-use eye drops, insulin pens, and reconstituted pediatric antibiotic syrups degrade or become bacterially contaminated weeks after opening—long before the printed box expiry date.
2. **High-Risk Misuse & Pediatric Poisoning:** Throwing unexpired or expired opioids, sedatives, or stimulants (such as Tramadol, Buprenorphine, Pethidine, Fentanyl, or Diazepam) directly into open household trash leads to accidental fatal ingestion by children/pets or intentional substance diversion.
3. **Environmental Contamination & Antimicrobial Resistance (AMR):** As documented in the **Central Drugs Standard Control Organisation (CDSCO) Guidance Document `WI/01/DCC-P-25` (Section 2: Background)**, un-segregated disposal of active pharmaceutical compounds—especially antibiotics—into municipal water tables and non-engineered landfills accelerates Antimicrobial Resistance (AMR).
4. **High Logging Friction & Format Confusion:** Families struggle with `MM/YYYY` strip dates vs. `YYYY-MM-DD` pickers, brand names vs. generic salts (e.g., *Cifran* vs. *Ciprofloxacin*, *Tramazac* vs. *Tramadol*), and complex disposal instructions.

---

## 2. Solution Overview ("The Tactile Apothecary")

**MedSafe** is a zero-friction, client-side Single Page Application (SPA) designed as an interactive **Virtual Frosted-Glass Medicine Cabinet** based on **CDSCO guidance `WI/01/DCC-P-25` and Bio-Medical Waste Management Rules, 2016**.

### 2.1 Core Value Propositions
* **Resilient Drug Autocomplete (NIH RxTerms API + Offline Indian/Global Dictionary):** Queries the zero-key **NIH/NLM RxTerms API** (`clinicaltables.nlm.nih.gov`) and merges it with an embedded **Offline Indian & Global Household Dictionary** (`OFFLINE_DRUG_DICTIONARY.length` entries dynamically computed in code, including *Dolo 650, Crocin, Ultracet, Tramazac, Tidigesic, Augmentin 625, Taxim-O, Cifran, Azithral, Pan-D, Asthalin, Lantus, Bravecto*, etc.). Works 100% offline and avoids OpenFDA shared-IP rate limits.
* **Four-State Urgency Engine with `MM/YYYY` Strip Dropdowns & In-Use Timers:**
  * Provides two dedicated dropdowns (**Month** + **Year**) for blister-strip expiry entry alongside an **"Exact Date (`YYYY-MM-DD`)"** mode, while keeping the flexible date parser as a safety net (automatically resolving `MM/YYYY` to the last valid calendar day of that month in local time).
  * Flags missing or corrupted dates as **`UNKNOWN_DATE` (`INVALID OR MISSING DATE • CHECK LABEL`)** in amber—never defaulting `NaN` to `SAFE`.
  * Enforces clinical **In-Use (Post-Opening) Expiry Overrides** for Eye/Ear Drops (28 days), Opened Insulin Pens or any medicine whose generic name contains `"insulin"` (28 days), and Reconstituted Antibiotic Dry Syrups (14 days).
* **Family Member Profiles & Storage Zones:** Color-coded tagging and filtering for `All`, `Kids`, `Adults`, `Seniors`, and `Pets`, plus storage location badges (`First-Aid Box`, `Bedroom Drawer`, `Fridge Door`, `Top Shelf`).
* **Hazard-Weighted Household Safety Score:** Uses the base weighted formula while preventing a large cabinet of safe vitamins from masking a single lethal hazard. If the cabinet is empty, it displays `100` (`"Cabinet Empty"`). If even **one** expired flush-list drug, expired biohazard sharp, or `UNKNOWN_DATE` item exists, the Household Safety Score is hard-capped at **45% (`CRITICAL_RISK`)**.
* **Deterministic Safe Disposal Wizard with Unrecognised-Drug Guard:** Prioritizes physical biohazards/explosives first (`Sharps/Needles` and `Pressurized Inhalers`), then checks normalized whole-word active ingredients against the **CDSCO `WI/01/DCC-P-25` Annexure D Flush List** and the **AMR-aware antibiotic list compiled for this app** (`ANTIBIOTIC_ROOTS.length` roots dynamically computed in code). If a medicine matches nothing in the offline dictionary AND has a blank or unmatched generic salt, it refuses to default to ordinary trash and prompts the user to check the salt on the strip or consult a pharmacist.
* **Mandatory Clinical Disclaimer Banner:** Permanently displays a clear pharmacist/medical disclaimer in the app footer and inside every disposal modal.

---

## 3. APIs, Regulatory Sources & Tech Stack

### 3.1 Live Public API (Zero-Auth, CORS-Enabled)
> **Architectural Note on OpenFDA:** OpenFDA enforces a strict 1,000 requests/day limit per IP address without an API key, which will throttle a hackathon room sharing one Wi-Fi NAT IP. Therefore, **MedSafe exclusively uses the NIH/NLM RxTerms API for live network calls**, paired with our offline Indian/Global dictionary.

1. **Primary Live Autocomplete — NIH / NLM Clinical Tables (RxTerms API):**
   * **Endpoint:** `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms={QUERY}&ef=STRENGTHS_AND_FORMS,RXCUIS&maxList=6`
   * **Response Handling:** Extracts drug display name and dosage form (`Oral Pill`, `Oral Liquid`, `Injectable`, `Inhaler`, `Ophthalmic`, `Otic`) with a 300ms debounce and a 2.5-second `AbortController` timeout that silently falls back to `OFFLINE_DRUG_DICTIONARY`.
2. **Deterministic API Dosage-Form to Category Mapper (`mapApiFormToCategory`):**
   When a user selects a live NIH RxTerms result, map the API dosage form string using these exact rules:
   * `"Oral Pill"` -> `"Tablet"`
   * `"Oral Liquid"` -> Prompt user: *"Is this a powder you mixed with water?"*
     * **Yes** -> `"Reconstituted Syrup"`
     * **No** -> `"Syrup"`
   * `"Injectable"` ->
     * If the drug name or generic name contains `"insulin"` (case-insensitive) -> `"Insulin Pen"` automatically.
     * Otherwise prompt user: *"Is this a pen or cartridge?"* -> **Yes** -> `"Insulin Pen"`, **No** -> `"Syringe"`.
   * `"Inhaler"` -> Prompt user: *"Spray canister or powder capsule?"*
     * **Spray** -> `"Pressurized Inhaler"`
     * **Capsule** -> `"Dry Powder Inhaler"`
     * **If unanswered / dismissed** -> Default to `"Pressurized Inhaler"` (the safer route).
   * `"Ophthalmic"` or `"Otic"` -> `"Drops"`
   * **Anything else** -> Prompt the user to pick a category explicitly. Never leave `category` blank.
3. **Local Chemist & Take-Back Locator URI:**
   * **Endpoint:** `https://www.google.com/maps/search/?api=1&query=registered+pharmacy+chemist+or+drug+take+back+center+near+me`
   * **UI Framing (India Context):** Clearly explains that dedicated take-back kiosks (such as Kerala's *nPROUD* or municipal RWA collection drives) are still emerging in India; instructs users to check if one exists near them or if their local registered chemist/hospital pharmacy accepts unused medicine returns before falling back to the household containment protocol.

### 3.2 Tech Stack, Tools, NPM Packages & Persistence Keys (Restored from v1)
* **Framework & Build Tool:** React 18+ with Vite (`npm create vite@latest medsafe -- --template react`)
* **Styling Engine:** Tailwind CSS v3.4 (`tailwindcss`, `postcss`, `autoprefixer`)
* **Icons:** `lucide-react` (`Pill`, `Syringe`, `Droplets`, `Wind`, `ShieldAlert`, `AlertTriangle`, `CheckCircle2`, `Trash2`, `MapPin`, `Sparkles`, `Users`, `Plus`, `Search`, `Printer`, `RotateCcw`, `HelpCircle`)
* **Micro-Interactions:** `canvas-confetti` (triggers celebratory animation when a user completes the safe disposal verification checklist)
* **LocalStorage Keys & Persistence:**
  * `medsafe_inventory_v1`: Active array of `MedicineItem` records.
  * `medsafe_disposed_history_v1`: Array of disposed/consumed audit logs (`{ id, brandName, genericName, action: "DISPOSED" | "CONSUMED", protocolUsed, timestamp }`).
  * Includes schema-validated JSON Import/Export and `@media print` emergency fridge sheet.

### 3.3 Regulatory & Clinical Datasets (`src/data/medicalDatasets.js`)

#### A. Text Normalisation Helper (`normalizeDrugText`)
Before any dictionary lookup or root matching, normalise strings by converting to lowercase, replacing hyphens (`-`) and slashes (`/`) with spaces, stripping non-alphanumeric punctuation, and collapsing multiple spaces into a single space:
```javascript
export function normalizeDrugText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/[-/]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

#### B. Flush List Based on CDSCO Guidance `WI/01/DCC-P-25` (Annexure D) + Indian Synonym `Pethidine`
* **Regulatory Basis:** Based on CDSCO guidance `WI/01/DCC-P-25` (Page 9 & Annexure D: 17 Medicines Recommended for Flushing: *Fentanyl, Fentanyl Citrate, Morphine Sulfate, Buprenorphine, Buprenorphine Hydrochloride, Methylphenidate, Meperidine Hydrochloride, Diazepam, Hydromorphone Hydrochloride, Methadone Hydrochloride, Hydrocodone Bitartrate, Tapentadol, Oxymorphone Hydrochloride, Oxycodone, Oxycodone Hydrochloride, Sodium Oxybate, Tramadol*), plus **`pethidine`** (India's standard clinical name for meperidine).
* **Whole-Word Matching Array (`CDSCO_FLUSH_ROOTS`):**
  ```javascript
  export const CDSCO_FLUSH_ROOTS = [
    "fentanyl", "morphine", "buprenorphine", "methylphenidate",
    "meperidine", "pethidine", "diazepam", "hydromorphone",
    "methadone", "hydrocodone", "tapentadol", "oxymorphone",
    "oxycodone", "sodium oxybate", "tramadol"
  ];
  ```
  Matched strictly on normalized text via word-boundary regex `\b...\b` so drugs like **Apomorphine** NEVER false-trigger `"morphine"`.

#### C. AMR-Aware Antibiotic List Compiled for This App (`ANTIBIOTIC_ROOTS`)
* **Description:** An AMR-aware list compiled for this app to prevent household sink/toilet flushing of antibacterials, informed by the hydrological Antimicrobial Resistance (AMR) risks discussed in CDSCO guidance `WI/01/DCC-P-25` (Section 2).
* **Dynamic Count:** Never hardcode the count in UI or pitch strings; always reference `ANTIBIOTIC_ROOTS.length`.
  ```javascript
  export const ANTIBIOTIC_ROOTS = [
    "amoxicillin", "amoxycillin", "clavulanate", "clavulanic", "ampicillin",
    "cloxacillin", "penicillin", "azithromycin", "clarithromycin", "erythromycin",
    "ciprofloxacin", "norfloxacin", "ofloxacin", "levofloxacin", "moxifloxacin",
    "cefixime", "cefpodoxime", "cefuroxime", "cephalexin", "ceftriaxone",
    "cefdinir", "cefadroxil", "cefoperazone", "doxycycline", "tetracycline",
    "minocycline", "metronidazole", "tinidazole", "ornidazole", "rifampicin",
    "isoniazid", "cotrimoxazole", "co trimoxazole", "trimethoprim",
    "sulfamethoxazole", "linezolid", "clindamycin", "nitrofurantoin",
    "gentamicin", "amikacin"
  ];
  ```

#### D. Offline Household Medicine Dictionary (`OFFLINE_DRUG_DICTIONARY`)
* **Dynamic Count:** Never hardcode the dictionary size in UI or pitch text; always compute `OFFLINE_DRUG_DICTIONARY.length` from the array in code.
* **Verified Indian Additions:** Includes **Tramazac** (*Tramadol Hydrochloride 50mg*, Zydus) and **Tidigesic** (*Buprenorphine Hydrochloride 0.2mg*, Sun Pharma), and removes *Apokyn / Apomorphine* from the user-facing dictionary (keeping `"apomorphine"` strictly inside `runSelfTests()`).

```javascript
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
  { brandName: "Bravecto Chewable", genericName: "Fluralaner 250mg Veterinary Chew", category: "Tablet" }
];
```

#### E. Known Non-Opioid / Non-Antibiotic Safe Generic Salts (`KNOWN_COMMON_SALTS`)
Used alongside `OFFLINE_DRUG_DICTIONARY`, `CDSCO_FLUSH_ROOTS`, and `ANTIBIOTIC_ROOTS` so recognised household generics (like `"paracetamol"`, `"ibuprofen"`, `"pantoprazole"`, `"cetirizine"`, `"apomorphine"`, `"salbutamol"`, `"fluralaner"`, `"calcium"`, `"vitamin"`) are identified as known non-flush/non-antibiotic compounds, whereas genuinely unknown strings trigger the **"Cannot identify"** guard:
```javascript
export const KNOWN_COMMON_SALTS = [
  "paracetamol", "acetaminophen", "ibuprofen", "diclofenac", "aceclofenac",
  "naproxen", "aspirin", "pantoprazole", "omeprazole", "rabeprazole",
  "esomeprazole", "domperidone", "ondansetron", "fexofenadine", "cetirizine",
  "levocetirizine", "loratadine", "montelukast", "salbutamol", "albuterol",
  "formoterol", "budesonide", "fluticasone", "insulin", "metformin",
  "glimepiride", "amlodipine", "telmisartan", "losartan", "atorvastatin",
  "rosuvastatin", "levothyroxine", "thyroxine", "carboxymethylcellulose",
  "povidone", "iodine", "calcium", "cholecalciferol", "vitamin", "zinc",
  "diphenhydramine", "dextromethorphan", "ambroxol", "guaifenesin",
  "fluralaner", "apomorphine", "loperamide", "ors", "electral"
];
```

---

## 4. Visual Design System ("Tactile Apothecary" UI — Restored & Adapted)

### 4.1 Color Tokens & Four-Status Urgency Semantics
* **App Canvas:** `bg-slate-50` (`#F8FAFC`) with a clean glassmorphic top command bar.
* **Cabinet Shelf Cards:** `bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden`
* **Status 1 — `EXPIRED` (`daysRemaining < 0` or In-Use Violation):**
  * Top Bottle Cap Strip: `bg-rose-600 h-2.5`
  * Card Border: `border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20`
  * Status Badge: `bg-rose-100 text-rose-800 border-rose-200 animate-pulse` -> `"EXPIRED {N} DAYS AGO"` (or specific in-use violation label)
  * **"Mark Consumed" Button Rule:** **NEVER** show `"Mark Consumed"` on an `EXPIRED` item.
* **Status 2 — `UNKNOWN_DATE` (Missing, blank, or unparseable expiry date):**
  * Top Bottle Cap Strip: `bg-amber-500 h-2.5`
  * Card Border: `border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/30`
  * Status Badge: `bg-amber-100 text-amber-900 border-amber-300 font-semibold` -> `"INVALID OR MISSING DATE • CHECK LABEL"`
  * **Quarantine & Action Rules:** Must appear in the pinned **Quarantine Banner** at the top of the dashboard so the family inspects the physical strip immediately, and its card must **NEVER** show `"Mark Consumed"`.
* **Status 3 — `EXPIRING_SOON` (`0 <= daysRemaining <= 30`):**
  * Top Bottle Cap Strip: `bg-amber-500 h-2.5`
  * Card Border: `border-amber-300 bg-amber-50/10`
  * Status Badge: `bg-amber-100 text-amber-800 border-amber-200` ->
    * If `daysRemaining === 0`: `"EXPIRES TODAY • LAST DAY OF VALIDITY"` (used consistently everywhere).
    * If `1 <= daysRemaining <= 30`: `"EXPIRES IN {N} DAY(S)"`.
  * Action Footer: Shows both **"Safe Disposal Guide"** and **"Mark Consumed"**.
* **Status 4 — `SAFE` (`daysRemaining > 30`):**
  * Top Bottle Cap Strip: `bg-emerald-500 h-2.5`
  * Card Border: `border-slate-200`
  * Status Badge: `bg-emerald-50 text-emerald-700 border-emerald-200` -> `"SAFE • {N} DAYS LEFT"`
  * Action Footer: Shows both **"Safe Disposal Guide"** and **"Mark Consumed"**.

### 4.2 Signature UI Components (Restored from v1 + Adapted to v2)
1. **Household Safety Score Header Widget:**
   * **Empty Cabinet Rule:** When `totalActive === 0`, return `{ score: 100, statusLabel: "Cabinet Empty", isCapped: false }`.
   * **Base Formula (Restored from v1, treating `UNKNOWN_DATE` with `EXPIRED` weight):**
     $$\text{Base Score} = \text{round}\left(\frac{\text{Total Active} - (\text{Expired Count} + \text{Unknown Date Count}) - (0.4 \times \text{Expiring Soon Count})}{\text{Total Active}} \times 100\right)$$
   * **v2 Critical Hazard Cap:** If the cabinet contains **any** expired flush-list drug, **any** expired sharp (`Syringe` or `Insulin Pen`), or **any** `UNKNOWN_DATE` item, cap the final score at **`Math.min(baseScore, 45)`** (`45% • Critical Action Required`).
   * Also displays a live badge showing `"Safely Disposed Count: {disposedCount}"`.
2. **Pinned Quarantine Strip (`QuarantineBanner.jsx`):**
   * Appears automatically below the navbar whenever `expiredCount > 0` OR `unknownDateCount > 0`.
   * Lists all `EXPIRED` medicines and all `UNKNOWN_DATE` (`INVALID OR MISSING DATE • CHECK LABEL`) items, with a 1-click **"Quarantine & Dispose / Inspect"** trigger.
3. **Physical Pill-Bottle Card Anatomy (`MedicineCard.jsx`):**
   * Top color-coded "bottle cap" strip (`h-2.5`).
   * Left icon badge indicating Dosage Form (`Tablet`, `Syrup`, `Reconstituted Syrup`, `Pressurized Inhaler`, `Dry Powder Inhaler`, `Topical`, `Drops`, `Syringe`, `Insulin Pen`).
   * Medicine `brandName` + `genericName` subtitle (or a yellow warning pill `"Salt unidentified — check strip"` if unrecognised).
   * Family Member Pill (`Kids`, `Adults`, `Seniors`, `Pets`) + Storage Location tag (`First-Aid Box`, `Bedroom Drawer`, `Fridge Door`, `Top Shelf`) + `quantity` badge.
   * Visual Shelf-Life Depletion Bar (`0%` to `100%`).
   * Primary Action Footer:
     * **"Safe Disposal Guide"** button (highlighted in crimson if `EXPIRED`, amber if `UNKNOWN_DATE`).
     * **"Mark Consumed"** button — rendered **ONLY** when `status === 'SAFE' || status === 'EXPIRING_SOON'`. **Never** rendered when `status === 'EXPIRED'` or `status === 'UNKNOWN_DATE'`.

---

## 5. Complete Data Schema, Date Engine & Safety Score (`src/utils/expiryEngine.js`)

### 5.1 `MedicineItem` Record Layout (Restored from v1)
Every medicine item stored in `medsafe_inventory_v1` follows this exact 11-field record layout:
```json
{
  "id": "demo_med_1",
  "brandName": "Augmentin 625 Duo",
  "genericName": "Amoxicillin 500mg & Potassium Clavulanate 125mg",
  "category": "Tablet",
  "familyMember": "Adults",
  "storageLocation": "First-Aid Box",
  "quantity": "6 Tablets",
  "openedDate": "",
  "expiryDate": "2027-04-30",
  "notes": "Take after meals",
  "createdAt": "2026-11-01T10:00:00.000Z"
}
```
* **Allowed `familyMember` values:** `"Kids"`, `"Adults"`, `"Seniors"`, `"Pets"`
* **Allowed `storageLocation` values:** `"First-Aid Box"`, `"Bedroom Drawer"`, `"Fridge Door"`, `"Top Shelf"`
* **Allowed `category` values:** `"Tablet"`, `"Syrup"`, `"Reconstituted Syrup"`, `"Pressurized Inhaler"`, `"Dry Powder Inhaler"`, `"Drops"`, `"Topical"`, `"Syringe"`, `"Insulin Pen"`

### 5.2 Expiry Entry UI (Two Dropdowns for Strip `MM/YYYY` + Exact Date Option) & Parser Safety Net
* **In `AddMedicineModal.jsx`:**
  * Default mode is **"Strip Month & Year (`MM/YYYY`)"** using **two `<select>` dropdowns**:
    1. **Month Dropdown:** `01 (Jan)` through `12 (Dec)`
    2. **Year Dropdown:** Current year (`2024`–`2036`)
    * Selecting Month `11` and Year `2026` formats the stored `expiryDate` as `"11/2026"`, which resolves to the last calendar day of November 2026 (`2026-11-30`).
  * Toggle button switches to **"Exact Date (`YYYY-MM-DD`)"** using a standard date input.
* **Safety-Net Parser (`parseLocalExpiryDate`):** Kept intact to safely parse `"YYYY-MM-DD"`, `"MM/YYYY"`, or `"YYYY-MM"`, while returning `null` on blank or nonsense strings.

### 5.3 In-Use (Post-Opening) Shelf-Life Rules (Including Universal `"insulin"` Generic Rule)
* **Eye/Ear Drops (`category === "Drops"`):** Discard **28 days** after opening.
* **Reconstituted Antibiotic Dry Syrups (`category === "Reconstituted Syrup"`):** Discard **14 days** after mixing with water.
* **Insulin Rule (`category === "Insulin Pen"` OR `genericName` / `brandName` contains `"insulin"`):** Any item whose `genericName` (or `brandName`) contains `"insulin"` **must** get the **28-day post-opening rule** regardless of whether the user chose `Syringe`, `Tablet`, or `Insulin Pen`.
* **Consistent Expiry Day Label:** When `daysRemaining === 0` (and no in-use violation exists), always return `"EXPIRES TODAY • LAST DAY OF VALIDITY"`.

```javascript
export const IN_USE_LIMIT_DAYS = {
  "Drops": 28,
  "Insulin Pen": 28,
  "Reconstituted Syrup": 14
};

export function getEffectiveInUseLimitDays(category, genericName = "", brandName = "") {
  const combined = `${genericName} ${brandName}`.toLowerCase();
  if (/\binsulin\b/i.test(combined)) {
    return 28; // Mandatory 28-day rule for any insulin item regardless of category
  }
  return IN_USE_LIMIT_DAYS[category] || null;
}

export function calculateExpiryStatus(expiryDateStr, category = "Tablet", openedDateStr = null, genericName = "", brandName = "") {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const expDate = parseLocalExpiryDate(expiryDateStr);
  if (!expDate || isNaN(expDate.getTime())) {
    return {
      status: "UNKNOWN_DATE",
      daysRemaining: null,
      inUseIssue: null,
      label: "INVALID OR MISSING DATE • CHECK LABEL",
      progressPercent: 100
    };
  }

  const expStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate(), 0, 0, 0, 0);
  const daysRemaining = Math.round((expStart - todayStart) / (1000 * 60 * 60 * 24));

  let inUseViolation = null;
  const maxOpenedDays = getEffectiveInUseLimitDays(category, genericName, brandName);
  if (openedDateStr && String(openedDateStr).trim() !== "") {
    const openedDate = parseLocalExpiryDate(openedDateStr);
    if (!openedDate) {
      inUseViolation = "INVALID OPENED DATE • VERIFY";
    } else {
      const openedStart = new Date(openedDate.getFullYear(), openedDate.getMonth(), openedDate.getDate(), 0, 0, 0, 0);
      const daysSinceOpened = Math.round((todayStart - openedStart) / (1000 * 60 * 60 * 24));
      if (daysSinceOpened < 0) {
        inUseViolation = "OPENED DATE IS IN THE FUTURE • VERIFY";
      } else if (maxOpenedDays && daysSinceOpened > maxOpenedDays) {
        const displayType = /\binsulin\b/i.test(`${genericName} ${brandName}`) ? "INSULIN" : category.toUpperCase();
        inUseViolation = `OPENED ${daysSinceOpened}d AGO (MAX ${maxOpenedDays}d FOR ${displayType})`;
      }
    }
  }

  if (daysRemaining < 0 || inUseViolation) {
    return {
      status: "EXPIRED",
      daysRemaining,
      inUseIssue: inUseViolation,
      label: inUseViolation
        ? inUseViolation
        : `EXPIRED ${Math.abs(daysRemaining)} DAY${Math.abs(daysRemaining) === 1 ? "" : "S"} AGO`,
      progressPercent: 100
    };
  }

  if (daysRemaining === 0) {
    return {
      status: "EXPIRING_SOON",
      daysRemaining: 0,
      inUseIssue: null,
      label: "EXPIRES TODAY • LAST DAY OF VALIDITY",
      progressPercent: 95
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: "EXPIRING_SOON",
      daysRemaining,
      inUseIssue: null,
      label: `EXPIRES IN ${daysRemaining} DAY${daysRemaining === 1 ? "" : "S"}`,
      progressPercent: Math.max(15, Math.min(92, Math.round(((30 - daysRemaining) / 30) * 100)))
    };
  }

  return {
    status: "SAFE",
    daysRemaining,
    inUseIssue: null,
    label: `SAFE • ${daysRemaining} DAYS LEFT`,
    progressPercent: Math.max(15, Math.min(100, Math.round((daysRemaining / 365) * 100)))
  };
}
```

---

## 6. Deterministic Safe Disposal Engine & Unrecognised Medicine Guard (`src/utils/disposalEngine.js`)

### 6.1 Text Normalisation, Brand Resolution & Identification Check (`identifyMedicineComposition`)
Before routing any medicine to a disposal branch:
1. Normalise both `brandName` and `genericName` via `normalizeDrugText()` (lowercased, hyphens and slashes replaced with spaces, extra spaces collapsed).
2. Check if `brandName` matches an entry in `OFFLINE_DRUG_DICTIONARY`. If matched, merge the dictionary entry's `genericName` into the normalized search text.
3. Check for whole-word matches in `CDSCO_FLUSH_ROOTS`, `ANTIBIOTIC_ROOTS`, and `KNOWN_COMMON_SALTS`.
4. **Unrecognised Medicine Rule (Task B.1):**
   If the medicine is **not** a physical Sharp (`Syringe`/`Insulin Pen`) or `Pressurized Inhaler`, AND:
   * `brandName` matches **nothing** in `OFFLINE_DRUG_DICTIONARY`, AND
   * `genericName` is blank OR matches nothing in `CDSCO_FLUSH_ROOTS`, `ANTIBIOTIC_ROOTS`, `KNOWN_COMMON_SALTS`, or `OFFLINE_DRUG_DICTIONARY`:
   * Set `isIdentified = false`.
   * **In the Add Medicine Form (`AddMedicineModal.jsx`):** Display a prominent amber warning banner:
     > *"We could not identify this medicine. Check the salt/composition printed on the strip and enter it."*
   * **In the Safe Disposal Modal (`SafeDisposalModal.jsx`):** Route to **Branch 5 (`UNIDENTIFIED_MEDICINE`)** which displays:
     > *"Cannot identify — ask a pharmacist before disposing"*
     > *"We could not identify this medicine. Check the salt/composition printed on the strip and enter it."*
     (Never default an unrecognised brand-only or blank-generic medicine to ordinary household trash steps).

```javascript
export function hasWholeWordMatch(rawText, rootList) {
  const normalized = normalizeDrugText(rawText);
  if (!normalized) return null;
  for (const rawRoot of rootList) {
    const normRoot = normalizeDrugText(rawRoot);
    if (!normRoot) continue;
    const escaped = normRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized)) return rawRoot;
  }
  return null;
}
```

### 6.2 Strict Priority Order of Disposal Branches
1. **Branch 1 — Needles, Syringes, Ampoules & Insulin Pens (`category === 'Syringe' || category === 'Insulin Pen'`):**
   * **Top Priority:** Physical needlestick/biohazard containment always overrides chemical flushing. Even if the syringe contains morphine, pethidine, or ceftriaxone, **NEVER flush a needle, glass ampoule, or pen injector down the toilet**.
   * If `hasWholeWordMatch(combinedText, CDSCO_FLUSH_ROOTS)` is true, prepend the Controlled Substance Sharps sub-alert before the 4-step Bio-Medical Waste Rules 2016 sharps container checklist.
2. **Branch 2 — Pressurized Metered-Dose Inhalers (`category === 'Pressurized Inhaler'`):**
   * **Trigger:** `category === 'Pressurized Inhaler'` (or an API `"Inhaler"` result where the user did not answer the Spray vs. Capsule prompt).
   * **Hazard Level:** `EXPLOSION_AND_PUNCTURE_HAZARD` (3-step aerosol hazard protocol).
3. **Branch 3 — Flush Route Based on CDSCO Guidance `WI/01/DCC-P-25` Annexure D (`flushMatch !== null`):**
   * **Trigger:** Whole-word match against `CDSCO_FLUSH_ROOTS` (including `tramadol`, `buprenorphine`, `pethidine`, `meperidine`, `morphine`, `fentanyl`, `oxycodone`, `diazepam`, `methylphenidate`, `tapentadol`, etc., or resolved via Indian brands like *Ultracet*, *Tramazac*, *Contramal*, *Tidigesic*, *Valium*, *Inspiral*).
   * **3-Step Verification Checklist:** Check if a local take-back point exists near you -> If none is available, flush down the toilet/sink immediately based on CDSCO guidance `WI/01/DCC-P-25` (Annexure D) -> Scratch out personal prescription details on empty packaging.
4. **Branch 4 — Antimicrobial Resistance (AMR) Do-Not-Flush Antibiotic Route (`antibioticMatch !== null`):**
   * **Trigger:** Whole-word match against `ANTIBIOTIC_ROOTS` (AMR-aware list compiled for this app, including `co trimoxazole` / `cotrimoxazole`, `cefadroxil`, `gentamicin`, `amikacin`, `penicillin`, `cefoperazone`, `ciprofloxacin`, `cefixime`, `amoxicillin`, etc., or resolved via brands like *Cifran*, *Taxim-O*, *Augmentin*, *Septran DS*).
   * **4-Step Verification Checklist:** Strictly DO NOT flush or pour down sink -> Immobilize with coffee grounds/soil -> Seal in leak-proof container -> Deface Rx label and discard in segregated household waste.
5. **Branch 5 — Unidentified Medicine Guard (`!isIdentified`):**
   * **Trigger:** Medicine name is not in `OFFLINE_DRUG_DICTIONARY` AND generic name is blank or unmatched in any known root list.
   * **Title:** `"Cannot identify — ask a pharmacist before disposing"`
   * **Notice:** `"We could not identify this medicine. Check the salt/composition printed on the strip and enter it."`
   * ** Verification Checklist:**
     1. `[ ]` Check the back of the blister strip or bottle label for the active generic salt/composition and edit this entry.
     2. `[ ]` Do NOT flush or throw in open household trash while the active composition is unknown.
     3. `[ ]` Consult your local registered pharmacist/chemist for safe identification and return/disposal.
6. **Branch 6 — Recognised Standard Household Medicines (`isIdentified === true`):**
   * **Trigger:** Recognised non-opioid, non-antibiotic medicines (e.g., *Dolo 650*, *Crocin*, *Pan-D*, *Foracort Rotacaps* [`Dry Powder Inhaler`], *Bravecto*, or known generic salts like `"Paracetamol"`, `"Apomorphine"`, `"Pantoprazole"`).
   * **4-Step Household Containment Checklist:** Mix (without crushing) with coffee grounds/soil -> Seal in plastic bag -> Scratch out patient info -> Place in closed household trash bin.

---

## 7. Pre-Built Judge Demo Dataset (`DEMO_CABINET_DATA`)

Uses deterministic unique IDs (`demo_med_1` through `demo_med_8`) and the full 11-field v1 record schema adapted to v2's categories:

| ID | Brand Name | Generic Name | Category | Family | Storage Location | Expiry Offset | Opened Offset | What It Proves to Judges |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `demo_med_1` | **Tramazac** | Tramadol Hydrochloride 50mg | `Tablet` | `Seniors` | `Bedroom Drawer` | **-14 Days (`EXPIRED`)** | `""` | **CDSCO Flush Route (Tramadol)** + Caps Safety Score at 45% + No "Mark Consumed". |
| `demo_med_2` | **Taxim-O 200** | Cefixime 200mg | `Tablet` | `Adults` | `First-Aid Box` | **-5 Days (`EXPIRED`)** | `""` | **AMR Antibiotic Do-Not-Flush Guard** + No "Mark Consumed". |
| `demo_med_3` | **Lantus SoloStar Pen** | Insulin Glargine Injection Pen | `Insulin Pen` | `Seniors` | `Fridge Door` | **+120 Days** | **Opened 40d ago** | **In-Use 28-Day Insulin Override (`EXPIRED`)** + **Biohazard Sharps Protocol**. |
| `demo_med_4` | **Augmentin Duo Syrup** | Amoxicillin & Clavulanate Oral Susp. | `Reconstituted Syrup` | `Kids` | `Fridge Door` | **+60 Days** | **Opened 18d ago** | **In-Use 14-Day Reconstituted Pediatric Syrup Override (`EXPIRED`)**. |
| `demo_med_5` | **Asthalin HFA Inhaler** | Salbutamol Pressurized Inhaler | `Pressurized Inhaler` | `Adults` | `Bedroom Drawer` | **+12 Days (`EXPIRING_SOON`)** | `""` | **Pressurized Canister Explosion Hazard Protocol**. |
| `demo_med_6` | **Calpol 250 Pediatric** | Paracetamol Oral Suspension | `Syrup` | `Kids` | `First-Aid Box` | **0 Days (Today)** | `""` | **Displays `"EXPIRES TODAY • LAST DAY OF VALIDITY"`**. |
| `demo_med_7` | **Dolo 650** | Paracetamol 650mg | `Tablet` | `Adults` | `First-Aid Box` | **+180 Days (`SAFE`)** | `""` | **Safe Green Status** + Offers **"Mark Consumed"**. |
| `demo_med_8` | **Bravecto Chewable** | Fluralaner 250mg Veterinary Chew | `Tablet` | `Pets` | `Top Shelf` | **+240 Days (`SAFE`)** | `""` | **Pets Profile Filter** + **Top Shelf** storage tag. |

---

## 8. Mandatory Automated Self-Test Suite (`runSelfTests()`)

Executed automatically on application load (`src/utils/selfTests.js`) and logged to the browser console with clear `PASS` / `FAIL` assertions for all 11 required verification cases:

1. **Blank date (`""`)** -> `calculateExpiryStatus("").status === "UNKNOWN_DATE"` and `label === "INVALID OR MISSING DATE • CHECK LABEL"`.
2. **Strip date (`"11/2026"`)** -> `parseLocalExpiryDate("11/2026")` resolves to `2026-11-30` (valid last day of November 2026 in local time).
3. **`"Apomorphine"`** -> `getDisposalProtocol({ brandName: "Apomorphine", genericName: "Apomorphine Hydrochloride", category: "Tablet" }).branchId !== "CDSCO_FLUSH"` (not flush route).
4. **`"Morphine Syringe"`** -> `getDisposalProtocol({ brandName: "Morphine Syringe", genericName: "Morphine Sulfate", category: "Syringe" }).branchId === "BIOHAZARD_SHARPS"` (routes to sharps container, never toilet flush).
5. **`"Cifran"`** -> `getDisposalProtocol({ brandName: "Cifran", genericName: "", category: "Tablet" }).branchId === "AMR_ANTIBIOTIC"` (triggers antibiotic warning via brand resolution).
6. **Insulin pen opened 40 days ago** -> `calculateExpiryStatus("+120d", "Insulin Pen", "-40d", "Insulin Glargine").status === "EXPIRED"` (and also `EXPIRED` even if `category === "Tablet"` when `genericName` contains `"insulin"`).
7. **`"Pethidine"`** -> `getDisposalProtocol({ brandName: "Pethidine", genericName: "Pethidine HCl", category: "Tablet" }).branchId === "CDSCO_FLUSH"` (flush route).
8. **`"Tramazac"`** -> `getDisposalProtocol({ brandName: "Tramazac", genericName: "", category: "Tablet" }).branchId === "CDSCO_FLUSH"` (flush route via Indian brand dictionary lookup).
9. **`"Co-trimoxazole"`** -> `getDisposalProtocol({ brandName: "Septran", genericName: "Co-trimoxazole", category: "Tablet" }).branchId === "AMR_ANTIBIOTIC"` (antibiotic warning after hyphen-to-space normalisation).
10. **Unknown name with blank generic (`brandName: "MysteryX99", genericName: ""`)** -> `getDisposalProtocol({ brandName: "MysteryX99", genericName: "", category: "Tablet" }).branchId === "UNIDENTIFIED_MEDICINE"` (shows `"Cannot identify — ask a pharmacist before disposing"` and `"We could not identify this medicine. Check the salt/composition printed on the strip and enter it."`).
11. **`"Inhaler"` from the API with no answer (`mapApiFormToCategory("Inhaler", "", null)`)** -> returns `"Pressurized Inhaler"` (the safer pressurized aerosol route).

---

## 9. Mandatory Safety & Legal Disclaimer (UI Footer & Modal Footer)
Every disposal modal and the main application footer must render this exact notice:
> **Clinical & Regulatory Disclaimer:** *MedSafe is an informational household organization tool based on CDSCO guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016. It does not constitute medical or legal advice. Never stop taking prescribed medication without consulting your physician, and always consult a registered pharmacist or local municipal authority when in doubt about pharmaceutical disposal.*