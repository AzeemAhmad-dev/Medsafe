import React from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  HelpCircle,
  ArrowRight,
  Flame,
} from "lucide-react";
import { calculateExpiryStatus } from "../utils/expiryEngine.js";

/**
 * Pinned Quarantine Strip (Section 4.2.2)
 * Appears automatically whenever expiredCount > 0 OR unknownDateCount > 0.
 * Lists all EXPIRED and UNKNOWN_DATE medicines with a 1-click trigger.
 */
export default function QuarantineBanner({
  inventory = [],
  onInspectOrDispose,
}) {
  // Extract all items that require quarantine
  const quarantineList = inventory
    .map((item) => ({
      item,
      statusObj: calculateExpiryStatus(
        item.expiryDate,
        item.category,
        item.openedDate,
        item.genericName,
        item.brandName
      ),
    }))
    .filter(
      ({ statusObj }) =>
        statusObj.status === "EXPIRED" || statusObj.status === "UNKNOWN_DATE"
    );

  if (quarantineList.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Quarantine Alert Banner"
      className="bg-rose-600 text-white shadow-md border-b border-rose-700 animate-fadeIn"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Header & Warning Description */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide uppercase">
                  Quarantine Strip Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-rose-700">
                  {quarantineList.length} Item{quarantineList.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Lethal pediatric/AMR hazard containment active. Quarantined medicines must not be consumed.
              </p>
            </div>
          </div>

          {/* Horizontal Chips List of Quarantined Medicines */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {quarantineList.slice(0, 4).map(({ item, statusObj }) => {
              const isUnknown = statusObj.status === "UNKNOWN_DATE";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onInspectOrDispose && onInspectOrDispose(item)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white text-white hover:text-rose-700 text-xs font-semibold transition-all border border-white/20 group"
                  title={`Inspect ${item.brandName}: ${statusObj.label}`}
                >
                  {isUnknown ? (
                    <HelpCircle className="w-3.5 h-3.5 text-amber-300 group-hover:text-rose-600" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-rose-200 group-hover:text-rose-600" />
                  )}
                  <span className="max-w-[120px] truncate">{item.brandName}</span>
                  <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            })}

            {quarantineList.length > 4 && (
              <span className="text-xs text-rose-200 font-medium px-1">
                +{quarantineList.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
