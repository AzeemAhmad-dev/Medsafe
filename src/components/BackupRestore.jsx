import React, { useState, useRef } from "react";
import {
  X,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
} from "lucide-react";

export default function BackupRestore({
  isOpen,
  onClose,
  inventory = [],
  history = [],
  onImportSuccess,
}) {
  const [importStatus, setImportStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle Export: creates a formatted JSON file and triggers browser download
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        application: "MedSafe",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        guidance: "CDSCO WI/01/DCC-P-25",
        stats: {
          totalInventory: inventory.length,
          totalAuditLogs: history.length,
        },
        medsafe_inventory_v1: inventory,
        medsafe_disposed_history_v1: history,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const d = new Date();
      const dateTag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const filename = `medsafe-cabinet-backup-${dateTag}.json`;

      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setImportStatus({
        type: "success",
        message: `Backup exported successfully as "${filename}" (${inventory.length} items, ${history.length} audit logs).`,
      });
    } catch (e) {
      setImportStatus({
        type: "error",
        message: `Export failed: ${e.message}`,
      });
    }
  };

  // Handle Import: reads user-selected JSON, validates schema, and restores state
  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let importedInventory = null;
      let importedHistory = [];

      // Support structured MedSafe backup schema
      if (Array.isArray(parsed.medsafe_inventory_v1)) {
        importedInventory = parsed.medsafe_inventory_v1;
        if (Array.isArray(parsed.medsafe_disposed_history_v1)) {
          importedHistory = parsed.medsafe_disposed_history_v1;
        }
      } else if (Array.isArray(parsed.inventory)) {
        importedInventory = parsed.inventory;
        if (Array.isArray(parsed.history)) {
          importedHistory = parsed.history;
        }
      } else if (Array.isArray(parsed)) {
        // Direct array of items
        importedInventory = parsed;
      }

      // Schema Validation
      if (!importedInventory || importedInventory.length === 0) {
        throw new Error("No valid medicine records found in the backup file.");
      }

      // Validate that at least the first few items have a brandName property
      const isValid = importedInventory.every((item) => item && typeof item === "object" && item.brandName);
      if (!isValid) {
        throw new Error(
          "Invalid record schema: each item must contain at least a 'brandName' property."
        );
      }

      // Save to localStorage directly
      localStorage.setItem("medsafe_inventory_v1", JSON.stringify(importedInventory));
      localStorage.setItem("medsafe_disposed_history_v1", JSON.stringify(importedHistory));

      // Notify parent to refresh state
      if (onImportSuccess) {
        onImportSuccess({
          inventory: importedInventory,
          history: importedHistory,
        });
      }

      setImportStatus({
        type: "success",
        message: `Successfully restored ${importedInventory.length} medicines and ${importedHistory.length} audit records.`,
      });
    } catch (err) {
      setImportStatus({
        type: "error",
        message: `Import failed: ${err.message}`,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Top Decorative Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-sky-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Data Portability &amp; Backup
              </h2>
              <p className="text-xs text-slate-500">
                JSON export &amp; schema-validated restore for your cabinet.
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

        {/* Status Alert if triggered */}
        {importStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs mb-5 flex items-start gap-2.5 ${
              importStatus.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                : "bg-rose-50 border border-rose-200 text-rose-900"
            }`}
          >
            {importStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed font-medium">{importStatus.message}</p>
          </div>
        )}

        {/* Export & Import Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Export Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs mb-1">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Backup</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Save a portable `.json` snapshot of your {inventory.length} active medicines and {history.length} audit history logs.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs mb-1">
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Import Backup</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Restore cabinet items from a previously exported `.json` file. Schema validated before overwriting.
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
                id="medsafe-backup-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Select JSON File</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Regulatory Portability Note */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            All data is processed 100% locally on your machine. MedSafe never uploads your household medical records or family prescription data to external servers.
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
