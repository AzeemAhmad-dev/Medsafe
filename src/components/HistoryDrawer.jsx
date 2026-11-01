import React from "react";
import {
  X,
  History,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

/**
 * Format timestamp into readable local date/time string
 */
function formatAuditTime(isoString) {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Human-readable protocol names
 */
function getProtocolBadge(protocolUsed) {
  switch (protocolUsed) {
    case "CDSCO_FLUSH":
      return { label: "CDSCO Annexure D Flush", bg: "bg-rose-100 text-rose-800 border-rose-200" };
    case "AMR_ANTIBIOTIC":
      return { label: "AMR Antibiotic Eco Guard", bg: "bg-sky-100 text-sky-800 border-sky-200" };
    case "BIOHAZARD_SHARPS":
      return { label: "Biohazard Sharps Container", bg: "bg-rose-100 text-rose-800 border-rose-200" };
    case "PRESSURIZED_INHALER":
      return { label: "Pressurized Aerosol Hazard", bg: "bg-amber-100 text-amber-800 border-amber-200" };
    case "UNIDENTIFIED_MEDICINE":
      return { label: "Pharmacist Return (Unidentified)", bg: "bg-amber-100 text-amber-800 border-amber-200" };
    case "STANDARD_CONTAINMENT":
    default:
      return { label: "Standard Household Containment", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  history = [],
  onClearHistory,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Audit History
              </h2>
              <p className="text-xs text-slate-500">
                Logged disposals &amp; consumption records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 mb-1">
                No Audit History Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                When you safely neutralize expired medicines or mark unexpired items consumed, permanent audit logs will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>Showing {history.length} action log{history.length > 1 ? "s" : ""}</span>
                <span className="text-[11px] font-mono">medsafe_disposed_history_v1</span>
              </div>

              {history.map((record) => {
                const isDisposed = record.action === "DISPOSED";
                const protocolBadge = isDisposed
                  ? getProtocolBadge(record.protocolUsed)
                  : null;

                return (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDisposed
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isDisposed ? (
                          <Trash2 className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {record.action}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatAuditTime(record.timestamp)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {record.brandName}
                      </h4>
                      {record.genericName && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {record.genericName}
                        </p>
                      )}
                    </div>

                    {isDisposed && protocolBadge && (
                      <div className="pt-1">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${protocolBadge.bg}`}
                        >
                          Protocol: {protocolBadge.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {history.length > 0 && onClearHistory ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Audit Log</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
