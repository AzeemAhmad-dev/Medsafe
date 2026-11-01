/**
 * MedSafe — Deterministic Safe Disposal Engine & Unrecognised Medicine Guard
 * Strictly follows Section 3.1 and Section 6 of master_specification_medsafe (2).md
 * Based on CDSCO Guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016
 */

import {
  normalizeDrugText,
  CDSCO_FLUSH_ROOTS,
  ANTIBIOTIC_ROOTS,
  OFFLINE_DRUG_DICTIONARY,
  KNOWN_COMMON_SALTS,
} from "../data/medicalDatasets.js";

export const MANDATORY_CLINICAL_DISCLAIMER =
  "MedSafe is an informational household organization tool based on CDSCO guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016. It does not constitute medical or legal advice. Never stop taking prescribed medication without consulting your physician, and always consult a registered pharmacist or local municipal authority when in doubt about pharmaceutical disposal.";

/**
 * Searches for whole-word boundary matches of roots within normalized input text.
 * Prevents false triggers (e.g. "apomorphine" never matches root "morphine").
 *
 * @param {string} rawText
 * @param {Array<string>} rootList
 * @returns {string|null} The matched root, or null
 */
export function hasWholeWordMatch(rawText, rootList) {
  const normalized = normalizeDrugText(rawText);
  if (!normalized || !rootList || !Array.isArray(rootList)) return null;

  for (const rawRoot of rootList) {
    const normRoot = normalizeDrugText(rawRoot);
    if (!normRoot) continue;
    const escaped = normRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized)) return rawRoot;
  }
  return null;
}

/**
 * Finds a matching entry in the offline dictionary.
 * Matches exact normalized brand name or whole-word brand prefix (e.g. "Cifran" -> "Cifran 500").
 *
 * @param {string} brandName
 * @returns {object|null}
 */
export function findDictionaryMatch(brandName) {
  if (!brandName || typeof brandName !== "string") return null;
  const normBrand = normalizeDrugText(brandName);
  if (!normBrand) return null;

  // 1. Exact normalized match
  for (const item of OFFLINE_DRUG_DICTIONARY) {
    if (normalizeDrugText(item.brandName) === normBrand) {
      return item;
    }
  }

  // 2. Whole-word match against dictionary entries
  for (const item of OFFLINE_DRUG_DICTIONARY) {
    const dictBrandNorm = normalizeDrugText(item.brandName);
    const escapedInput = normBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escapedInput}\\b`, "i").test(dictBrandNorm)) {
      return item;
    }
    const escapedDict = dictBrandNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escapedDict}\\b`, "i").test(normBrand)) {
      return item;
    }
  }

  return null;
}

/**
 * Identifies medicine composition, resolving offline Indian brands
 * and enforcing the Unrecognised Medicine Guard (Section 6.1).
 *
 * @param {string} brandName
 * @param {string} genericName
 * @param {string} category
 * @returns {object} { isIdentified, matchedDictionaryEntry, resolvedGenericName, flushMatch, antibioticMatch, commonSaltMatch, warningMessage }
 */
export function identifyMedicineComposition(brandName = "", genericName = "", category = "Tablet") {
  const isSharp = category === "Syringe" || category === "Insulin Pen";
  const isAerosol = category === "Pressurized Inhaler";

  const dictMatch = findDictionaryMatch(brandName);
  const resolvedGeneric =
    genericName && String(genericName).trim() !== ""
      ? genericName
      : dictMatch
      ? dictMatch.genericName
      : "";

  const combinedText = `${brandName} ${genericName} ${dictMatch ? dictMatch.genericName : ""}`;

  const flushMatch = hasWholeWordMatch(combinedText, CDSCO_FLUSH_ROOTS);
  const antibioticMatch = hasWholeWordMatch(combinedText, ANTIBIOTIC_ROOTS);
  const commonSaltMatch = hasWholeWordMatch(combinedText, KNOWN_COMMON_SALTS);

  // Unrecognised Medicine Rule:
  // If not a physical sharp or aerosol inhaler, AND brand not in dictionary,
  // AND genericName is blank or matches nothing in known lists:
  let isIdentified = true;
  if (!isSharp && !isAerosol) {
    const brandInDict = dictMatch !== null;
    const genericHasSaltMatch = Boolean(flushMatch || antibioticMatch || commonSaltMatch);
    if (!brandInDict && (!genericName || String(genericName).trim() === "" || !genericHasSaltMatch)) {
      isIdentified = false;
    }
  }

  return {
    isIdentified,
    matchedDictionaryEntry: dictMatch,
    resolvedGenericName: resolvedGeneric,
    combinedText,
    flushMatch,
    antibioticMatch,
    commonSaltMatch,
    warningMessage: !isIdentified
      ? "We could not identify this medicine. Check the salt/composition printed on the strip and enter it."
      : null,
  };
}

/**
 * Deterministic API Dosage-Form to Category Mapper (Section 3.1)
 *
 * @param {string} apiForm - API dosage form string (e.g. "Oral Pill", "Oral Liquid", "Inhaler")
 * @param {string} drugText - Drug name or generic text (used to auto-detect insulin)
 * @param {object|string|boolean|null} promptAnswers - Optional user disambiguation answers
 * @returns {string} One of the 9 standard MedSafe categories
 */
export function mapApiFormToCategory(apiForm = "", drugText = "", promptAnswers = null) {
  const formStr = String(apiForm || "").trim();
  const textStr = String(drugText || "").toLowerCase();

  if (/oral pill/i.test(formStr) || /tablet/i.test(formStr) || /capsule/i.test(formStr)) {
    return "Tablet";
  }

  if (/oral liquid/i.test(formStr) || /liquid/i.test(formStr) || /syrup/i.test(formStr)) {
    if (
      promptAnswers === true ||
      promptAnswers === "yes" ||
      promptAnswers === "reconstituted" ||
      promptAnswers?.isReconstituted === true ||
      promptAnswers?.isPowder === true
    ) {
      return "Reconstituted Syrup";
    }
    return "Syrup";
  }

  if (/injectable/i.test(formStr) || /injection/i.test(formStr)) {
    if (/\binsulin\b/i.test(textStr)) {
      return "Insulin Pen";
    }
    if (
      promptAnswers === true ||
      promptAnswers === "yes" ||
      promptAnswers === "pen" ||
      promptAnswers?.isPenOrCartridge === true
    ) {
      return "Insulin Pen";
    }
    if (
      promptAnswers === false ||
      promptAnswers === "no" ||
      promptAnswers === "syringe" ||
      promptAnswers?.isPenOrCartridge === false
    ) {
      return "Syringe";
    }
    return "Syringe";
  }

  if (/inhaler/i.test(formStr)) {
    if (
      promptAnswers === "capsule" ||
      promptAnswers === "dry powder" ||
      promptAnswers?.inhalerType === "Capsule" ||
      promptAnswers?.isSpray === false
    ) {
      return "Dry Powder Inhaler";
    }
    // Default to Pressurized Inhaler if unanswered / dismissed / spray (safer route)
    return "Pressurized Inhaler";
  }

  if (/ophthalmic/i.test(formStr) || /otic/i.test(formStr) || /drops/i.test(formStr)) {
    return "Drops";
  }

  if (/topical/i.test(formStr) || /cream/i.test(formStr) || /ointment/i.test(formStr) || /gel/i.test(formStr)) {
    return "Topical";
  }

  if (promptAnswers?.category) {
    return promptAnswers.category;
  }

  return "Tablet";
}

/**
 * Deterministic Safe Disposal Protocol Router (Section 6.2)
 * Strictly evaluates disposal branches in exact priority order:
 * 1. Branch 1 — Needles, Syringes, Ampoules & Insulin Pens (BIOHAZARD_SHARPS)
 * 2. Branch 2 — Pressurized Metered-Dose Inhalers (PRESSURIZED_INHALER)
 * 3. Branch 3 — Flush Route Based on CDSCO Guidance WI/01/DCC-P-25 Annexure D (CDSCO_FLUSH)
 * 4. Branch 4 — Antimicrobial Resistance (AMR) Do-Not-Flush Antibiotic Route (AMR_ANTIBIOTIC)
 * 5. Branch 5 — Unidentified Medicine Guard (UNIDENTIFIED_MEDICINE)
 * 6. Branch 6 — Recognised Standard Household Medicines (STANDARD_CONTAINMENT)
 *
 * @param {object} medicineItem - { brandName, genericName, category }
 * @returns {object} Protocol details, hazard level, verification steps, and regulatory disclaimer
 */
export function getDisposalProtocol(medicineItem = {}) {
  const brandName = medicineItem.brandName || "";
  const genericName = medicineItem.genericName || "";
  const category = medicineItem.category || "Tablet";

  const composition = identifyMedicineComposition(brandName, genericName, category);

  // =========================================================================
  // Branch 1 — Needles, Syringes, Ampoules & Insulin Pens (Top Priority)
  // Physical biohazard containment ALWAYS overrides chemical flushing.
  // =========================================================================
  if (category === "Syringe" || category === "Insulin Pen") {
    const hasControlledSubstance = Boolean(composition.flushMatch);
    return {
      branchId: "BIOHAZARD_SHARPS",
      branchNumber: 1,
      theme: "rose",
      hazardLevel: "BIOHAZARD_SHARPS_HAZARD",
      title: "Biohazard Sharps Container Protocol (Bio-Medical Waste Management Rules, 2016)",
      notice:
        "High-risk biohazard and needlestick injury prevention. Strictly never place loose needles in household trash.",
      hasControlledSubstanceSharpsSubAlert: hasControlledSubstance,
      controlledSubstanceAlert: hasControlledSubstance
        ? `CONTROLLED SUBSTANCE BIOHAZARD WARNING: Even though this item contains a controlled compound (${composition.flushMatch.toUpperCase()}), NEVER flush a needle, glass ampoule, syringe, or pen injector down a toilet or drain. Puncture and bloodborne infection prevention takes absolute clinical priority.`
        : null,
      steps: [
        "Never recap needles, detach needles by hand, or throw loose needles/pens directly into household trash or recycling bins.",
        "Immediately place used sharps in a puncture-proof, heavy-duty plastic container (e.g., an empty HDPE laundry detergent bottle or certified sharps container).",
        "Seal tightly with screw-top lid and secure with heavy-duty duct tape when the container is 3/4 full.",
        "Clearly label 'SHARPS — BIOHAZARD — DO NOT RECYCLE' in permanent marker and deliver to a registered hospital, clinic, or municipal biohazard collection kiosk.",
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };
  }

  // =========================================================================
  // Branch 2 — Pressurized Metered-Dose Inhalers
  // Puncture and explosion prevention.
  // =========================================================================
  if (category === "Pressurized Inhaler") {
    return {
      branchId: "PRESSURIZED_INHALER",
      branchNumber: 2,
      theme: "amber",
      hazardLevel: "EXPLOSION_AND_PUNCTURE_HAZARD",
      title: "Pressurized Aerosol Canister Hazard Protocol",
      notice:
        "Pressurized metal canister hazard. Compaction or heat exposure can cause violent explosion.",
      steps: [
        "Never puncture, pierce, crush, or incinerate the pressurized metal canister, even when completely empty.",
        "Do NOT dispose of pressurized canisters in municipal trash compactors or open waste burning.",
        "Check with your local hazardous household waste collection program or return to a participating chemist for high-temperature aerosol incineration.",
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };
  }

  // =========================================================================
  // Branch 3 — Flush Route Based on CDSCO Guidance WI/01/DCC-P-25 (Annexure D)
  // Controlled substances where immediate flushing prevents fatal poisoning/diversion.
  // =========================================================================
  if (composition.flushMatch) {
    const compoundUpper = composition.flushMatch.toUpperCase();
    return {
      branchId: "CDSCO_FLUSH",
      branchNumber: 3,
      theme: "rose",
      hazardLevel: "CONTROLLED_SUBSTANCE_FLUSH_ALERT",
      title: "CDSCO Annexure D Immediate Flush Protocol",
      matchedCompound: composition.flushMatch,
      notice: `Identified high-potency controlled compound (${compoundUpper}). Immediate diversion and poisoning prevention protocol based on CDSCO WI/01/DCC-P-25.`,
      steps: [
        "Check if an authorized local chemist take-back kiosk or municipal collection drive is immediately accessible near you.",
        `If no authorized take-back program is immediately available, immediately flush down the sink or toilet based on CDSCO Guidance WI/01/DCC-P-25 (Annexure D: ${compoundUpper}) to prevent accidental fatal pediatric ingestion or illicit diversion.`,
        "Scratch out and thoroughly deface all personal patient identification and prescription details on the empty outer packaging before recycling or discarding cardboard/blisters.",
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };
  }

  // =========================================================================
  // Branch 4 — Antimicrobial Resistance (AMR) Do-Not-Flush Antibiotic Route
  // Hydrological AMR prevention based on CDSCO Section 2.
  // =========================================================================
  if (composition.antibioticMatch) {
    const compoundUpper = composition.antibioticMatch.toUpperCase();
    return {
      branchId: "AMR_ANTIBIOTIC",
      branchNumber: 4,
      theme: "blue",
      hazardLevel: "AMR_WATER_CONTAMINATION_HAZARD",
      title: "Antimicrobial Resistance (AMR) Do-Not-Flush Eco Guard",
      matchedCompound: composition.antibioticMatch,
      notice: `Identified active antibacterial compound (${compoundUpper}). Discharging antibiotics into sewage accelerates environmental Antimicrobial Resistance (AMR).`,
      steps: [
        `STRICTLY DO NOT FLUSH OR POUR DOWN SINK: Discharging antibiotics (${compoundUpper}) into household drains breeds drug-resistant superbugs in local aquifers and municipal water supplies.`,
        "Immobilize & Mix (Do Not Crush): Mix intact tablets, capsules, or syrup with unpalatable household waste (used coffee grounds, dirt, or cat litter).",
        "Seal in Leak-Proof Container: Place the immobilized mixture into a sealable plastic zip bag or airtight container so it cannot leach or be scavenged.",
        "Deface Rx Label & Discard: Deface personal prescription details on the outer strip/bottle and discard the sealed container in segregated dry household waste.",
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };
  }

  // =========================================================================
  // Branch 5 — Unidentified Medicine Guard
  // Refuses to default unknown compounds to household trash.
  // =========================================================================
  if (!composition.isIdentified) {
    return {
      branchId: "UNIDENTIFIED_MEDICINE",
      branchNumber: 5,
      theme: "amber",
      hazardLevel: "UNIDENTIFIED_COMPOSITION_HAZARD",
      title: "Cannot identify — ask a pharmacist before disposing",
      notice:
        "We could not identify this medicine. Check the salt/composition printed on the strip and enter it.",
      steps: [
        "Check the back of the blister strip or bottle label for the active generic salt/composition and edit this entry.",
        "Do NOT flush or throw in open household trash while the active composition is unknown.",
        "Consult your local registered pharmacist/chemist for safe identification and return/disposal.",
      ],
      disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
    };
  }

  // =========================================================================
  // Branch 6 — Recognised Standard Household Medicines
  // Standard household trash immobilization & privacy protection.
  // =========================================================================
  return {
    branchId: "STANDARD_CONTAINMENT",
    branchNumber: 6,
    theme: "emerald",
    hazardLevel: "STANDARD_HOUSEHOLD_CONTAINMENT",
    title: "Standard Household Containment & Segregation Protocol",
    notice:
      "Recognised non-opioid, non-antibiotic household medication. Standard FDA/CDSCO containment protocol.",
    steps: [
      "Mix (without crushing) intact pills or liquids with an unpalatable household substance (used coffee grounds, dirt, or cat litter).",
      "Seal the mixture into a leak-proof zipper bag or airtight container so children, pets, or scavengers cannot access it.",
      "Scratch out and deface family member name, doctor name, and prescription details on the packaging with a permanent black marker.",
      "Place both the sealed mixture and defaced empty container into your closed household trash bin for municipal collection.",
    ],
    disclaimer: MANDATORY_CLINICAL_DISCLAIMER,
  };
}
