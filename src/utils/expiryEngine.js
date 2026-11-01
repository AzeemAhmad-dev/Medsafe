/**
 * MedSafe — Expiry Date Calculator & In-Use Post-Opening Shelf Life Engine
 * Strictly follows Section 5 of master_specification_medsafe (2).md
 */

/**
 * Standard In-Use Limit Days post opening
 */
export const IN_USE_LIMIT_DAYS = {
  Drops: 28,
  "Insulin Pen": 28,
  "Reconstituted Syrup": 14,
};

/**
 * Parses date inputs in local time to prevent UTC midnight off-by-one errors across timezones.
 * Handles:
 * - "YYYY-MM-DD" (standard date picker input)
 * - "MM/YYYY" (blister strip standard — resolves to the last valid calendar day of that month)
 * - "YYYY-MM" (resolves to last calendar day of that month)
 * - Relative offset strings like "+120d", "-40d", "0d" (used for dynamic testing and demos)
 * - Full ISO strings (e.g. "2026-11-01T10:00:00.000Z")
 *
 * @param {string} dateString
 * @returns {Date|null} Date object at local midnight, or null if invalid
 */
export function parseLocalExpiryDate(dateString) {
  if (!dateString) return null;
  const str = String(dateString).trim();
  if (!str) return null;

  // 1. Relative offset strings e.g. "+120d", "-40d", "0d", "14d"
  const offsetMatch = str.match(/^([+-]?\d+)\s*d(?:ays?)?$/i);
  if (offsetMatch) {
    const offset = parseInt(offsetMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  // 2. Strip standard MM/YYYY e.g. "11/2026" -> resolves to last day of Nov 2026 (Nov 30)
  const mmYyyyMatch = str.match(/^(0?[1-9]|1[0-2])\/(\d{4})$/);
  if (mmYyyyMatch) {
    const month = parseInt(mmYyyyMatch[1], 10); // 1-12
    const year = parseInt(mmYyyyMatch[2], 10);
    // In JS Date, day 0 of month M is the last day of month M - 1.
    // E.g., for month 11 (November), new Date(year, 11, 0) gives November 30.
    return new Date(year, month, 0, 0, 0, 0, 0);
  }

  // 3. YYYY-MM -> resolves to last day of that month
  const yyyyMmMatch = str.match(/^(\d{4})-(0?[1-9]|1[0-2])$/);
  if (yyyyMmMatch) {
    const year = parseInt(yyyyMmMatch[1], 10);
    const month = parseInt(yyyyMmMatch[2], 10);
    return new Date(year, month, 0, 0, 0, 0, 0);
  }

  // 4. Standard YYYY-MM-DD
  const yyyyMmDdMatch = str.match(/^(\d{4})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/);
  if (yyyyMmDdMatch) {
    const year = parseInt(yyyyMmDdMatch[1], 10);
    const month = parseInt(yyyyMmDdMatch[2], 10) - 1;
    const day = parseInt(yyyyMmDdMatch[3], 10);
    const dt = new Date(year, month, day, 0, 0, 0, 0);
    if (dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day) {
      return dt;
    }
    return null;
  }

  // 5. ISO strings
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const datePart = str.substring(0, 10);
    return parseLocalExpiryDate(datePart);
  }

  return null;
}

/**
 * Determines effective in-use post-opening shelf life limit in days.
 * Mandatory Universal Insulin Rule:
 * Any medicine whose genericName or brandName contains the whole-word "insulin"
 * gets the mandatory 28-day rule regardless of whether category is "Insulin Pen", "Syringe", or "Tablet".
 *
 * @param {string} category
 * @param {string} genericName
 * @param {string} brandName
 * @returns {number|null} In-use limit in days, or null if no override
 */
export function getEffectiveInUseLimitDays(category = "Tablet", genericName = "", brandName = "") {
  const combined = `${genericName} ${brandName}`.toLowerCase();
  if (/\binsulin\b/i.test(combined)) {
    return 28; // Mandatory 28-day rule for any insulin item regardless of category
  }
  return IN_USE_LIMIT_DAYS[category] || null;
}

/**
 * Calculates expiry urgency status and in-use violation.
 * Enforces the 4-status urgency semantics:
 * - EXPIRED
 * - UNKNOWN_DATE
 * - EXPIRING_SOON
 * - SAFE
 *
 * @param {string} expiryDateStr
 * @param {string} category
 * @param {string} openedDateStr
 * @param {string} genericName
 * @param {string} brandName
 * @returns {object} { status, daysRemaining, inUseIssue, label, progressPercent }
 */
export function calculateExpiryStatus(
  expiryDateStr,
  category = "Tablet",
  openedDateStr = null,
  genericName = "",
  brandName = ""
) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const expDate = parseLocalExpiryDate(expiryDateStr);
  if (!expDate || isNaN(expDate.getTime())) {
    return {
      status: "UNKNOWN_DATE",
      daysRemaining: null,
      inUseIssue: null,
      label: "INVALID OR MISSING DATE • CHECK LABEL",
      progressPercent: 100,
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
        const displayType = /\binsulin\b/i.test(`${genericName} ${brandName}`)
          ? "INSULIN"
          : (category || "").toUpperCase();
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
      progressPercent: 100,
    };
  }

  if (daysRemaining === 0) {
    return {
      status: "EXPIRING_SOON",
      daysRemaining: 0,
      inUseIssue: null,
      label: "EXPIRES TODAY • LAST DAY OF VALIDITY",
      progressPercent: 95,
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: "EXPIRING_SOON",
      daysRemaining,
      inUseIssue: null,
      label: `EXPIRES IN ${daysRemaining} DAY${daysRemaining === 1 ? "" : "S"}`,
      progressPercent: Math.max(15, Math.min(92, Math.round(((30 - daysRemaining) / 30) * 100))),
    };
  }

  return {
    status: "SAFE",
    daysRemaining,
    inUseIssue: null,
    label: `SAFE • ${daysRemaining} DAYS LEFT`,
    progressPercent: Math.max(15, Math.min(100, Math.round((daysRemaining / 365) * 100))),
  };
}

/**
 * Calculates Hazard-Weighted Household Safety Score (Section 4.2)
 *
 * Base Formula:
 * round(((Total Active - (Expired + UnknownDate) - (0.4 * ExpiringSoon)) / Total Active) * 100)
 *
 * Critical Hazard Cap:
 * If the cabinet contains ANY expired flush-list drug, ANY expired sharp (Syringe/Insulin Pen),
 * or ANY UNKNOWN_DATE item, the final score is hard-capped at 45% (Critical Action Required).
 *
 * @param {Array} inventory
 * @param {number} disposedCount
 * @returns {object}
 */
export function calculateSafetyScore(inventory = [], disposedCount = 0) {
  const totalActive = inventory.length;
  if (totalActive === 0) {
    return {
      score: 100,
      statusLabel: "Cabinet Empty",
      isCapped: false,
      expiredCount: 0,
      unknownDateCount: 0,
      expiringSoonCount: 0,
      safeCount: 0,
      disposedCount,
    };
  }

  let expiredCount = 0;
  let unknownDateCount = 0;
  let expiringSoonCount = 0;
  let safeCount = 0;
  let hasCriticalHazard = false;

  for (const item of inventory) {
    const statusObj = calculateExpiryStatus(
      item.expiryDate,
      item.category,
      item.openedDate,
      item.genericName,
      item.brandName
    );

    if (statusObj.status === "EXPIRED") {
      expiredCount++;
      if (item.category === "Syringe" || item.category === "Insulin Pen") {
        hasCriticalHazard = true;
      }
      const combined = `${item.brandName || ""} ${item.genericName || ""}`.toLowerCase();
      if (/\b(tramadol|fentanyl|morphine|buprenorphine|pethidine|meperidine|diazepam|oxycodone|methadone|hydromorphone|tapentadol)\b/i.test(combined)) {
        hasCriticalHazard = true;
      }
    } else if (statusObj.status === "UNKNOWN_DATE") {
      unknownDateCount++;
      hasCriticalHazard = true;
    } else if (statusObj.status === "EXPIRING_SOON") {
      expiringSoonCount++;
    } else {
      safeCount++;
    }
  }

  const baseScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((totalActive - (expiredCount + unknownDateCount) - 0.4 * expiringSoonCount) / totalActive) * 100
      )
    )
  );

  const isCapped = hasCriticalHazard && baseScore > 45;
  const finalScore = hasCriticalHazard ? Math.min(baseScore, 45) : baseScore;

  let statusLabel = "Safe & Well-Maintained";
  if (hasCriticalHazard || finalScore <= 45) {
    statusLabel = "Critical Action Required";
  } else if (finalScore < 70) {
    statusLabel = "Needs Attention";
  } else if (finalScore < 85) {
    statusLabel = "Good Condition";
  }

  return {
    score: finalScore,
    baseScore,
    statusLabel,
    isCapped,
    expiredCount,
    unknownDateCount,
    expiringSoonCount,
    safeCount,
    disposedCount,
  };
}
