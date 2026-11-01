import React from "react";
import {
  Pill,
  Syringe,
  Droplets,
  Wind,
  Sparkles,
  MapPin,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { calculateExpiryStatus } from "../utils/expiryEngine.js";
import { identifyMedicineComposition } from "../utils/disposalEngine.js";

/**
 * Maps category dosage forms to matching Lucide icons
 */
export function getCategoryIcon(category) {
  switch (category) {
    case "Syringe":
    case "Insulin Pen":
      return Syringe;
    case "Drops":
    case "Syrup":
    case "Reconstituted Syrup":
      return Droplets;
    case "Pressurized Inhaler":
    case "Dry Powder Inhaler":
      return Wind;
    case "Topical":
      return Sparkles;
    case "Tablet":
    default:
      return Pill;
  }
}

/**
 * Maps family member to thematic tag styles
 */
export function getFamilyColor(familyMember) {
  switch (familyMember) {
    case "Kids":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Seniors":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Pets":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Adults":
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
}

/**
 * MedicineCard Component — Physical Pill-Bottle Card Anatomy (Section 4.1 & 4.2.3)
 */
export default function MedicineCard({
  item,
  onDisposalClick,
  onMarkConsumed,
  onDelete,
}) {
  const expiryInfo = calculateExpiryStatus(
    item.expiryDate,
    item.category,
    item.openedDate,
    item.genericName,
    item.brandName
  );

  const composition = identifyMedicineComposition(
    item.brandName,
    item.genericName,
    item.category
  );

  const IconComponent = getCategoryIcon(item.category);
  const status = expiryInfo.status;

  // Determine container styling based on 4 urgency statuses
  let stripColor = "bg-emerald-500";
  let cardBorder = "border-slate-200 hover:border-slate-300";
  let badgeClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let progressBarColor = "bg-emerald-500";
  let disposalButtonClasses =
    "border border-slate-300 text-slate-700 hover:bg-slate-100";

  if (status === "EXPIRED") {
    stripColor = "bg-rose-600";
    cardBorder = "border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/20";
    badgeClasses = "bg-rose-100 text-rose-800 border-rose-200 animate-pulse font-semibold";
    progressBarColor = "bg-rose-600";
    disposalButtonClasses =
      "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30";
  } else if (status === "UNKNOWN_DATE") {
    stripColor = "bg-amber-500";
    cardBorder = "border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/30";
    badgeClasses = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
    progressBarColor = "bg-amber-500";
    disposalButtonClasses =
      "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30";
  } else if (status === "EXPIRING_SOON") {
    stripColor = "bg-amber-500";
    cardBorder = "border-amber-300 bg-amber-50/10";
    badgeClasses = "bg-amber-100 text-amber-800 border-amber-200 font-semibold";
    progressBarColor = "bg-amber-500";
    disposalButtonClasses =
      "border border-amber-300 text-amber-800 hover:bg-amber-50";
  }

  // Can item be consumed? (STRICT RULE: Only SAFE or EXPIRING_SOON, NEVER EXPIRED or UNKNOWN_DATE)
  const canMarkConsumed = status === "SAFE" || status === "EXPIRING_SOON";

  return (
    <div
      className={`shelf-card bg-white border ${cardBorder} shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between print-break-inside-avoid`}
    >
      <div>
        {/* Top "Bottle Cap" Strip */}
        <div className={`h-2.5 w-full ${stripColor}`} />

        <div className="p-4 sm:p-5">
          {/* Header Row: Category Icon + Brand & Generic + Status Badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  status === "EXPIRED"
                    ? "bg-rose-100 text-rose-700"
                    : status === "UNKNOWN_DATE"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700"
                }`}
                title={item.category}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {item.brandName || "Unnamed Medicine"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {item.genericName ||
                    composition.resolvedGenericName ||
                    "Composition not provided"}
                </p>
              </div>
            </div>

            {/* Delete button (quiet icon) */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="no-print text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50"
                title="Remove from cabinet"
                aria-label="Remove medicine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Unidentified Generic Salt Warning Pill */}
          {!composition.isIdentified && (
            <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
              <span>Salt unidentified — check strip</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="mb-3">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${badgeClasses}`}
            >
              {status === "EXPIRED" && <ShieldAlert className="w-3 h-3" />}
              {status === "UNKNOWN_DATE" && <AlertTriangle className="w-3 h-3" />}
              {status === "EXPIRING_SOON" && <AlertTriangle className="w-3 h-3" />}
              {status === "SAFE" && <CheckCircle2 className="w-3 h-3" />}
              {expiryInfo.label}
            </span>
          </div>

          {/* Storage & Profile Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs mb-3.5">
            {/* Family Member Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${getFamilyColor(
                item.familyMember
              )}`}
            >
              <Users className="w-3 h-3" />
              {item.familyMember || "All"}
            </span>

            {/* Storage Location Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-[11px]">
              <MapPin className="w-3 h-3 text-slate-400" />
              {item.storageLocation || "Drawer"}
            </span>

            {/* Quantity Badge */}
            {item.quantity && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono">
                {item.quantity}
              </span>
            )}
          </div>

          {/* Opened / Expiry Date Details */}
          <div className="text-[11px] text-slate-500 mb-3 space-y-0.5 bg-slate-50/60 p-2 rounded-lg border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-400">Box Expiry:</span>
              <span className="font-medium text-slate-700">
                {item.expiryDate || "Not recorded"}
              </span>
            </div>
            {item.openedDate && (
              <div className="flex justify-between">
                <span className="text-slate-400">Date Opened:</span>
                <span className="font-medium text-slate-700">
                  {item.openedDate}
                </span>
              </div>
            )}
            {item.notes && (
              <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/50 mt-1">
                "{item.notes}"
              </p>
            )}
          </div>

          {/* Shelf-Life Depletion Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Depletion Timeline</span>
              <span>{expiryInfo.progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${progressBarColor}`}
                style={{ width: `${Math.min(100, Math.max(8, expiryInfo.progressPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Footer (No Print) */}
      <div className="no-print p-3 sm:px-5 sm:py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Safe Disposal Guide Trigger (Always Rendered) */}
        <button
          type="button"
          onClick={() => onDisposalClick(item)}
          className={`flex-1 text-xs font-semibold px-3 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${disposalButtonClasses}`}
        >
          <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Safe Disposal Guide</span>
        </button>

        {/* Mark Consumed Trigger (Rendered ONLY if SAFE or EXPIRING_SOON) */}
        {canMarkConsumed && onMarkConsumed && (
          <button
            type="button"
            onClick={() => onMarkConsumed(item)}
            className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm shadow-emerald-600/20 text-center flex items-center justify-center gap-1.5"
            title="Mark as consumed and move to audit log"
          >
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Mark Consumed</span>
          </button>
        )}
      </div>
    </div>
  );
}
