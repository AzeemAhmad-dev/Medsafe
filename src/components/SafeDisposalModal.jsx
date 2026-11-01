import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";

import {
  getDisposalProtocol,
  MANDATORY_CLINICAL_DISCLAIMER,
} from "../utils/disposalEngine.js";

const GOOGLE_MAPS_CHEMIST_URL =
  "https://www.google.com/maps/search/?api=1&query=registered+pharmacy+chemist+or+drug+take+back+center+near+me";

export default function SafeDisposalModal({
  isOpen,
  item,
  onClose,
  onConfirmDisposed,
}) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [confettiFired, setConfettiFired] = useState(false);

  // Re-initialize checklist state when item changes
  useEffect(() => {
    setCheckedSteps({});
    setConfettiFired(false);
  }, [item]);

  if (!isOpen || !item) return null;

  const protocol = getDisposalProtocol(item);
  const totalSteps = protocol.steps ? protocol.steps.length : 0;
  const checkedCount = Object.values(checkedSteps).filter(Boolean).length;
  const allStepsCompleted = totalSteps > 0 && checkedCount === totalSteps;

  // Trigger confetti micro-interaction when all steps are checked
  const handleToggleStep = (idx) => {
    const nextState = {
      ...checkedSteps,
      [idx]: !checkedSteps[idx],
    };
    setCheckedSteps(nextState);

    const willBeAllCompleted =
      totalSteps > 0 &&
      protocol.steps.every((_, i) => (i === idx ? !checkedSteps[idx] : !!checkedSteps[i]));

    if (willBeAllCompleted && !confettiFired) {
      setConfettiFired(true);
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.65 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"],
        });
      } catch (e) {
        console.warn("Confetti animation error:", e);
      }
    }
  };

  // Determine modal theme colors
  let headerColor = "bg-emerald-600";
  let iconBg = "bg-emerald-100 text-emerald-700";
  let alertBg = "bg-emerald-50 border-emerald-200 text-emerald-900";

  if (protocol.theme === "rose") {
    headerColor = "bg-rose-600";
    iconBg = "bg-rose-100 text-rose-700";
    alertBg = "bg-rose-50 border-rose-200 text-rose-900";
  } else if (protocol.theme === "amber") {
    headerColor = "bg-amber-500";
    iconBg = "bg-amber-100 text-amber-700";
    alertBg = "bg-amber-50 border-amber-200 text-amber-900";
  } else if (protocol.theme === "blue") {
    headerColor = "bg-sky-600";
    iconBg = "bg-sky-100 text-sky-700";
    alertBg = "bg-sky-50 border-sky-200 text-sky-900";
  }

  // Branch 3 (CDSCO Flush) and Branch 5 (Unidentified Medicine) show Google Maps chemist locator
  const showChemistLocator =
    protocol.branchId === "CDSCO_FLUSH" ||
    protocol.branchId === "UNIDENTIFIED_MEDICINE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Top Accent Strip */}
        <div className={`absolute top-0 left-0 right-0 h-2.5 ${headerColor}`} />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 mb-4 pt-1">
          <div className="flex items-start space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
            >
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Branch {protocol.branchNumber}: {protocol.branchId}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  CDSCO WI/01/DCC-P-25
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug mt-1">
                {protocol.title}
              </h2>
              <p className="text-xs text-slate-500">
                Item:{" "}
                <strong className="text-slate-800">{item.brandName}</strong>{" "}
                ({item.genericName || "Composition unverified"}) • {item.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controlled Substance Sharps Sub-Alert (Branch 1 Priority Exception) */}
        {protocol.hasControlledSubstanceSharpsSubAlert && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>CRITICAL BIOHAZARD OVERRIDE:</strong> Even though this item contains a controlled flush-list compound, <strong>NEVER flush needles, glass ampoules, or injector pens down a toilet</strong>. Physical biohazard sharps containment takes absolute clinical priority over sink/toilet flushing.
            </p>
          </div>
        )}

        {/* Hazard Notice Callout */}
        {protocol.notice && (
          <div className={`mb-4 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${alertBg}`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{protocol.notice}</p>
          </div>
        )}

        {/* Registered Chemist & Take-Back Locator URI (Section 3.1 India Context) */}
        {showChemistLocator && (
          <div className="mb-4 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs">
            <div className="flex items-center space-x-2 font-bold text-sky-900 mb-1">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Local Chemist &amp; Take-Back Locator</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed mb-2">
              Dedicated drop-off kiosks (such as Kerala's <em>nPROUD</em> or municipal collection drives) are emerging in India. Check if your neighborhood chemist or hospital pharmacy accepts unused medicine returns before household disposal.
            </p>
            <a
              href={GOOGLE_MAPS_CHEMIST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline"
            >
              <span>Locate Nearby Registered Chemists on Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Multi-Step Interactive Verification Checklist */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Protocol Checklist ({checkedCount}/{totalSteps} Completed)
            </h3>
            {allStepsCompleted && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Verified &amp; Safe to Discard
              </span>
            )}
          </div>

          <div className="space-y-2">
            {protocol.steps.map((step, idx) => {
              const isChecked = !!checkedSteps[idx];
              return (
                <label
                  key={idx}
                  onClick={() => handleToggleStep(idx)}
                  className={`flex items-start space-x-3 p-3.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? "bg-emerald-50/70 border-emerald-300 text-slate-900 font-medium"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="leading-relaxed">{step}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!allStepsCompleted}
            onClick={() => onConfirmDisposed(item, protocol)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              allStepsCompleted
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Safe Disposal</span>
          </button>
        </div>

        {/* Mandatory Clinical & Regulatory Disclaimer (Section 9) */}
        <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-relaxed italic">
          <strong>Clinical &amp; Regulatory Disclaimer:</strong>{" "}
          {MANDATORY_CLINICAL_DISCLAIMER}
        </div>
      </div>
    </div>
  );
}
