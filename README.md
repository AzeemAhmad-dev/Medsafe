# MedSafe — Household Medicine Expiry & Safe Disposal Portal

> **Based on CDSCO Guidance Document `WI/01/DCC-P-25` and Bio-Medical Waste Management Rules, 2016.**

MedSafe is a zero-friction, client-side Single Page Application (SPA) designed as a **Virtual Frosted-Glass Medicine Cabinet** ("The Tactile Apothecary"). It empowers families to track medicine expiration, enforces post-opening in-use degradation limits, and provides a deterministic, hazard-weighted safe disposal wizard to prevent antimicrobial resistance (AMR), pediatric poisoning, and substance diversion.

---

## Key Features

1. **Four-State Urgency Surveillance & Shelf-Life Bar:**
   * **`EXPIRED` (Rose):** Highlights sub-potent or bacterially degraded drugs. Strictly hides the "Mark Consumed" action.
   * **`UNKNOWN_DATE` (Amber):** Catches missing or unreadable dates and flags them for immediate physical inspection. Never defaults unparseable dates to safe.
   * **`EXPIRING_SOON` (Amber):** Visual warning for medications with $\le 30$ days remaining, including a dedicated indicator for *"EXPIRES TODAY • LAST DAY OF VALIDITY"*.
   * **`SAFE` (Emerald):** Clear indication of safe medicines with remaining shelf life.

2. **Clinical In-Use (Post-Opening) Shelf-Life Overrides:**
   * **Eye/Ear Drops (`Drops`):** 28-day post-opening limit to prevent bacterial keratitis/conjunctival infection.
   * **Universal Insulin Rule (`Insulin Pen` / any compound containing `"insulin"`):** Mandatory 28-day room-temperature limit post-opening regardless of assigned form.
   * **Reconstituted Antibiotic Syrups:** 14-day limit post-mixing with sterile water.

3. **Hazard-Weighted Household Safety Score:**
   * Calculates a real-time safety index across active cabinet inventory.
   * **45% Critical Hazard Cap:** If the cabinet contains *any* expired flush-list drug, *any* biohazard sharp (`Syringe` or `Insulin Pen`), or *any* `UNKNOWN_DATE` medicine, the score is hard-capped at 45% (`CRITICAL_RISK`).
   * **Empty Cabinet Rule:** Accurately displays 100% (`"Cabinet Empty"`) when 0 items are present.

4. **Deterministic 6-Branch Safe Disposal Wizard:**
   * **Branch 1 — Biohazard Sharps Protocol:** Strict containerization for needles, ampoules, and pens under Bio-Medical Waste Rules 2016. Physical needlestick safety overrides chemical flushing.
   * **Branch 2 — Pressurized Aerosol Hazard:** Anti-puncture and explosion protocol for pressurized inhalers.
   * **Branch 3 — CDSCO Annexure D Immediate Flush Route:** Controlled substances (Tramadol, Buprenorphine, Pethidine, Morphine, Diazepam, etc.) where rapid sink/toilet disposal prevents pediatric fatality and illicit diversion.
   * **Branch 4 — AMR Eco-Guard (Do Not Flush):** Prevents water-table contamination and superbug breeding for antibacterials.
   * **Branch 5 — Unrecognised Medicine Guard:** Refuses to default unknown compounds to trash; prompts user to check the blister salt or consult a pharmacist.
   * **Branch 6 — Standard Household Containment:** FDA/CDSCO coffee grounds / soil immobilization and privacy defacing protocol.

5. **Live Autocomplete & Offline Dictionary:**
   * Debounced fetch to **NIH / NLM RxTerms API** with a 2.5-second `AbortController` timeout.
   * Merged with an embedded offline Indian & global household dictionary (`Dolo 650`, `Crocin Advance`, `Ultracet`, `Tramazac`, `Taxim-O 200`, `Cifran 500`, `Augmentin 625 Duo`, `Lantus`, `Asthalin`, etc.).

6. **Emergency Fridge Door Sheet (`@media print`):**
   * High-contrast A4 print roster of active household medications for first responders, emergency services, and elderly caregivers, listing emergency helpline numbers (112, 108, 1066).

7. **Data Portability & Audit Log:**
   * 100% client-side privacy. Full JSON Backup/Restore export and import.
   * Chronological audit log for consumed and safely neutralized medicines.

---

## Tech Stack

* **Framework:** React 19 + Vite
* **Styling:** Tailwind CSS v3.4 + PostCSS + Autoprefixer
* **Icons:** `lucide-react`
* **Micro-Interactions:** `canvas-confetti`
* **Persistence:** `localStorage` (`medsafe_inventory_v1`, `medsafe_disposed_history_v1`)

---

## Automated Verification Suite

MedSafe includes a built-in automated clinical test suite (`src/utils/selfTests.js`) that runs 11 mandatory assertions on load:

1. Blank date (`""`) $\rightarrow$ `UNKNOWN_DATE` (`INVALID OR MISSING DATE • CHECK LABEL`).
2. Strip date (`11/2026`) $\rightarrow$ Resolves to last calendar day of November 2026 (`2026-11-30`).
3. Word-boundary regex $\rightarrow$ `"Apomorphine"` does not trigger `"morphine"` flush route.
4. Needlestick priority $\rightarrow$ `"Morphine Syringe"` routes to biohazard sharps container, not flush.
5. Brand resolution $\rightarrow$ `"Cifran"` triggers AMR Antibiotic guard.
6. Universal insulin rule $\rightarrow$ Enforces 28-day expiration across any category for insulin.
7. Synonym resolution $\rightarrow$ `"Pethidine"` triggers CDSCO Annexure D flush protocol.
8. Dictionary lookup $\rightarrow$ `"Tramazac"` resolves to Tramadol flush protocol.
9. Normalization $\rightarrow$ `"Co-trimoxazole"` hyphen normalization triggers AMR antibiotic warning.
10. Unidentified guard $\rightarrow$ Unknown medicine without generic composition triggers pharmacist consultation branch.
11. Safe default $\rightarrow$ Unanswered inhaler dosage form safely defaults to pressurized aerosol canister.

---

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/AzeemAhmad-dev/Medsafe.git
cd Medsafe

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Regulatory & Clinical Disclaimer

> **Clinical & Regulatory Disclaimer:** *MedSafe is an informational household organization tool based on CDSCO guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016. It does not constitute medical or legal advice. Never stop taking prescribed medication without consulting your physician, and always consult a registered pharmacist or local municipal authority when in doubt about pharmaceutical disposal.*
