/**
 * MedSafe — Mandatory Automated Self-Test Suite (Section 8)
 * Verifies regulatory compliance, date parser precision, AMR guard, and biohazard priority.
 */

import {
  parseLocalExpiryDate,
  calculateExpiryStatus,
} from "./expiryEngine.js";
import {
  getDisposalProtocol,
  mapApiFormToCategory,
} from "./disposalEngine.js";

/**
 * Runs the 11 mandatory clinical and algorithmic self-test assertions.
 * Logs PASS / FAIL to the console for each case and returns a summary report.
 *
 * @returns {object} { passed: number, total: number, allPassed: boolean, results: Array }
 */
export function runSelfTests() {
  const results = [];

  // =========================================================================
  // Test 1: Blank date ("") -> UNKNOWN_DATE + "INVALID OR MISSING DATE • CHECK LABEL"
  // =========================================================================
  try {
    const res = calculateExpiryStatus("");
    const pass =
      res.status === "UNKNOWN_DATE" &&
      res.label === "INVALID OR MISSING DATE • CHECK LABEL";
    results.push({
      id: 1,
      title: "Blank date resolves to UNKNOWN_DATE",
      passed: pass,
      detail: `status="${res.status}", label="${res.label}"`,
    });
  } catch (err) {
    results.push({ id: 1, title: "Blank date", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 2: Strip date ("11/2026") -> 2026-11-30 in local time
  // =========================================================================
  try {
    const d = parseLocalExpiryDate("11/2026");
    const pass =
      d !== null &&
      d.getFullYear() === 2026 &&
      d.getMonth() === 10 && // 0-indexed November
      d.getDate() === 30;
    const formatted = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "null";
    results.push({
      id: 2,
      title: "Strip date '11/2026' resolves to last day of November 2026",
      passed: pass,
      detail: `resolved to ${formatted}`,
    });
  } catch (err) {
    results.push({ id: 2, title: "Strip date 11/2026", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 3: "Apomorphine" -> branchId !== "CDSCO_FLUSH" (Word-boundary regex check)
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Apomorphine",
      genericName: "Apomorphine Hydrochloride",
      category: "Tablet",
    });
    const pass = res.branchId !== "CDSCO_FLUSH";
    results.push({
      id: 3,
      title: "'Apomorphine' does NOT false-trigger CDSCO Flush Route",
      passed: pass,
      detail: `routed to ${res.branchId}`,
    });
  } catch (err) {
    results.push({ id: 3, title: "Apomorphine boundary check", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 4: "Morphine Syringe" -> BIOHAZARD_SHARPS (Sharps priority over chemical flush)
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Morphine Syringe",
      genericName: "Morphine Sulfate",
      category: "Syringe",
    });
    const pass = res.branchId === "BIOHAZARD_SHARPS";
    results.push({
      id: 4,
      title: "'Morphine Syringe' prioritizes Biohazard Sharps protocol over flush",
      passed: pass,
      detail: `branchId="${res.branchId}", controlledSubAlert=${res.hasControlledSubstanceSharpsSubAlert}`,
    });
  } catch (err) {
    results.push({ id: 4, title: "Morphine Syringe sharps priority", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 5: "Cifran" -> AMR_ANTIBIOTIC via brand resolution
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Cifran",
      genericName: "",
      category: "Tablet",
    });
    const pass = res.branchId === "AMR_ANTIBIOTIC";
    results.push({
      id: 5,
      title: "'Cifran' triggers AMR Antibiotic guard via offline brand resolution",
      passed: pass,
      detail: `branchId="${res.branchId}", matched="${res.matchedCompound}"`,
    });
  } catch (err) {
    results.push({ id: 5, title: "Cifran brand resolution", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 6: Insulin opened 40 days ago -> EXPIRED (Universal 28-day insulin rule)
  // =========================================================================
  try {
    const resPen = calculateExpiryStatus("+120d", "Insulin Pen", "-40d", "Insulin Glargine");
    const resTab = calculateExpiryStatus("+120d", "Tablet", "-40d", "Insulin Glargine");
    const pass = resPen.status === "EXPIRED" && resTab.status === "EXPIRED";
    results.push({
      id: 6,
      title: "Universal 28-day insulin rule enforces EXPIRED across any category",
      passed: pass,
      detail: `penStatus="${resPen.status}", tabletStatus="${resTab.status}"`,
    });
  } catch (err) {
    results.push({ id: 6, title: "Insulin 28-day in-use limit", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 7: "Pethidine" -> CDSCO_FLUSH (Indian clinical synonym for meperidine)
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Pethidine",
      genericName: "Pethidine HCl",
      category: "Tablet",
    });
    const pass = res.branchId === "CDSCO_FLUSH";
    results.push({
      id: 7,
      title: "'Pethidine' triggers CDSCO Annexure D Flush Route",
      passed: pass,
      detail: `branchId="${res.branchId}", matched="${res.matchedCompound}"`,
    });
  } catch (err) {
    results.push({ id: 7, title: "Pethidine flush route", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 8: "Tramazac" -> CDSCO_FLUSH via Indian brand dictionary lookup
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Tramazac",
      genericName: "",
      category: "Tablet",
    });
    const pass = res.branchId === "CDSCO_FLUSH";
    results.push({
      id: 8,
      title: "'Tramazac' (Indian brand) resolves to Tramadol flush route",
      passed: pass,
      detail: `branchId="${res.branchId}", matched="${res.matchedCompound}"`,
    });
  } catch (err) {
    results.push({ id: 8, title: "Tramazac brand lookup", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 9: "Co-trimoxazole" -> AMR_ANTIBIOTIC after hyphen normalisation
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "Septran",
      genericName: "Co-trimoxazole",
      category: "Tablet",
    });
    const pass = res.branchId === "AMR_ANTIBIOTIC";
    results.push({
      id: 9,
      title: "'Co-trimoxazole' triggers AMR Antibiotic warning after hyphen normalisation",
      passed: pass,
      detail: `branchId="${res.branchId}", matched="${res.matchedCompound}"`,
    });
  } catch (err) {
    results.push({ id: 9, title: "Co-trimoxazole hyphen normalisation", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 10: Unknown name with blank generic -> UNIDENTIFIED_MEDICINE guard
  // =========================================================================
  try {
    const res = getDisposalProtocol({
      brandName: "MysteryX99",
      genericName: "",
      category: "Tablet",
    });
    const pass =
      res.branchId === "UNIDENTIFIED_MEDICINE" &&
      res.title === "Cannot identify — ask a pharmacist before disposing" &&
      res.notice === "We could not identify this medicine. Check the salt/composition printed on the strip and enter it.";
    results.push({
      id: 10,
      title: "Unknown medicine without generic triggers UNIDENTIFIED_MEDICINE guard",
      passed: pass,
      detail: `branchId="${res.branchId}", title="${res.title}"`,
    });
  } catch (err) {
    results.push({ id: 10, title: "Unrecognised medicine guard", passed: false, detail: err.message });
  }

  // =========================================================================
  // Test 11: "Inhaler" from API with no answer -> "Pressurized Inhaler"
  // =========================================================================
  try {
    const res = mapApiFormToCategory("Inhaler", "", null);
    const pass = res === "Pressurized Inhaler";
    results.push({
      id: 11,
      title: "API 'Inhaler' with dismissed prompt defaults safely to Pressurized Inhaler",
      passed: pass,
      detail: `category="${res}"`,
    });
  } catch (err) {
    results.push({ id: 11, title: "API Inhaler default category", passed: false, detail: err.message });
  }

  // =========================================================================
  // Log formatted output to browser console
  // =========================================================================
  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  console.group("%c[MedSafe Automated Clinical Self-Tests (CDSCO WI/01/DCC-P-25)]", "color: #059669; font-weight: bold; font-size: 13px;");
  results.forEach((r) => {
    const badge = r.passed ? "%cPASS" : "%cFAIL";
    const style = r.passed ? "color: #10b981; font-weight: bold;" : "color: #ef4444; font-weight: bold;";
    console.log(`${badge} %c[Test ${r.id}/11]: ${r.title} (${r.detail})`, style, "color: inherit;");
  });
  console.log(
    `%c[Result]: ${passedCount}/${results.length} tests passed.${allPassed ? " All regulatory & algorithmic assertions VERIFIED." : " Issues detected."}`,
    allPassed ? "color: #059669; font-weight: bold;" : "color: #dc2626; font-weight: bold;"
  );
  console.groupEnd();

  return {
    passed: passedCount,
    total: results.length,
    allPassed,
    results,
  };
}
