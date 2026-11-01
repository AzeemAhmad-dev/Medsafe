import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  HelpCircle,
} from "lucide-react";
import { calculateSafetyScore } from "../utils/expiryEngine.js";

/**
 * HouseholdSafetyScore Widget (Section 4.2.1)
 * Renders the hazard-weighted household safety score,
 * reflecting the Empty Cabinet rule (100) and the 45% Critical Hazard Cap.
 */
export default function HouseholdSafetyScore({
  inventory = [],
  disposedCount = 0,
  onQuarantineClick,
}) {
  const scoreData = calculateSafetyScore(inventory, disposedCount);
  const {
    score,
    baseScore,
    statusLabel,
    isCapped,
    expiredCount,
    unknownDateCount,
    expiringSoonCount,
    safeCount,
  } = scoreData;

  const totalActive = inventory.length;

  // Determine styling based on score and critical hazard cap
  let scoreBadgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  let ringColor = "stroke-emerald-500";
  let textColor = "text-emerald-700";

  if (isCapped || score <= 45) {
    scoreBadgeColor = "text-rose-800 bg-rose-50 border-rose-300";
    ringColor = "stroke-rose-600";
    textColor = "text-rose-700";
  } else if (score < 70) {
    scoreBadgeColor = "text-amber-800 bg-amber-50 border-amber-300";
    ringColor = "stroke-amber-500";
    textColor = "text-amber-700";
  } else if (score < 85) {
    scoreBadgeColor = "text-teal-800 bg-teal-50 border-teal-200";
    ringColor = "stroke-teal-500";
    textColor = "text-teal-700";
  }

  return (
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-3xl p-5 sm:p-6 transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Section: Score Display & Title */}
        <div className="flex items-center space-x-5">
          {/* Circular Score Gauge */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-slate-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                className={`${ringColor} transition-all duration-700 ease-out`}
                strokeWidth="10"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * Math.max(5, score)) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ${textColor}`}>
                {score}
                <span className="text-xs sm:text-sm font-semibold text-slate-400">%</span>
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Safety
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Household Safety Score
              </h2>
              {isCapped && (
                <span
                  title="Score hard-capped at 45% due to active biohazard sharps, flush-list narcotics, or unverified dates"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse flex items-center gap-1"
                >
                  <ShieldAlert className="w-3 h-3" />
                  CAP 45% ACTIVE
                </span>
              )}
            </div>

            {/* Status Pill */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${scoreBadgeColor}`}
              >
                {isCapped || score <= 45 ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {totalActive === 0 ? "Cabinet Empty" : statusLabel}
              </span>

              {/* Live Safely Disposed Count Badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Safely Disposed Count: {disposedCount}
              </span>
            </div>

            <p className="text-xs text-slate-500 max-w-md">
              {isCapped
                ? "Critical Action Required: Cabinet contains expired flush-list drugs, sharps, or invalid dates. Neutralize immediately."
                : "Real-time clinical safety index based on CDSCO Guidance WI/01/DCC-P-25."}
            </p>
          </div>
        </div>

        {/* Right Section: Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
          {/* Active Medicines */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center min-w-[90px]">
            <p className="text-[11px] font-medium text-slate-500">Active</p>
            <p className="text-lg font-bold text-slate-800">{totalActive}</p>
          </div>

          {/* Expired / Quarantine */}
          <button
            type="button"
            onClick={onQuarantineClick}
            className={`border rounded-2xl p-3 text-center min-w-[90px] transition-all ${
              expiredCount + unknownDateCount > 0
                ? "bg-rose-50/80 border-rose-300 text-rose-900 hover:bg-rose-100 cursor-pointer shadow-sm"
                : "bg-slate-50 border-slate-200/80 text-slate-800"
            }`}
            title="View quarantined medicines"
          >
            <p className="text-[11px] font-medium flex items-center justify-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>Quarantine</span>
            </p>
            <p className="text-lg font-bold text-rose-700">
              {expiredCount + unknownDateCount}
            </p>
          </button>

          {/* Expiring Soon */}
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3 text-center min-w-[90px]">
            <p className="text-[11px] font-medium text-amber-700 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span>&le;30 Days</span>
            </p>
            <p className="text-lg font-bold text-amber-800">{expiringSoonCount}</p>
          </div>

          {/* Safe */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3 text-center min-w-[90px]">
            <p className="text-[11px] font-medium text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Safe</span>
            </p>
            <p className="text-lg font-bold text-emerald-800">{safeCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
