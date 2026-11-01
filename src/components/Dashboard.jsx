import React, { useState, useEffect } from "react";
import {
  Pill,
  Search,
  Plus,
  Printer,
  RotateCcw,
  Users,
  MapPin,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  Clock,
  History,
  Database,
  PhoneCall,
  FileText,
} from "lucide-react";

import { DEMO_CABINET_DATA, getDemoCabinetData } from "../data/medicalDatasets.js";
import { calculateExpiryStatus } from "../utils/expiryEngine.js";
import { MANDATORY_CLINICAL_DISCLAIMER } from "../utils/disposalEngine.js";
import MedicineCard from "./MedicineCard.jsx";
import HouseholdSafetyScore from "./HouseholdSafetyScore.jsx";
import QuarantineBanner from "./QuarantineBanner.jsx";
import AddMedicineModal from "./AddMedicineModal.jsx";
import SafeDisposalModal from "./SafeDisposalModal.jsx";
import HistoryDrawer from "./HistoryDrawer.jsx";
import BackupRestore from "./BackupRestore.jsx";

const STORAGE_KEY_INVENTORY = "medsafe_inventory_v1";
const STORAGE_KEY_HISTORY = "medsafe_disposed_history_v1";

const FAMILY_OPTIONS = ["All", "Kids", "Adults", "Seniors", "Pets"];
const STORAGE_OPTIONS = [
  "All",
  "First-Aid Box",
  "Bedroom Drawer",
  "Fridge Door",
  "Top Shelf",
];

export default function Dashboard() {
  // Load inventory from LocalStorage, falling back to DEMO_CABINET_DATA
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load inventory from localStorage:", e);
    }
    return getDemoCabinetData();
  });

  // Load audit history
  const [disposedHistory, setDisposedHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not load history from localStorage:", e);
    }
    return [];
  });

  // Filter & Search State
  const [selectedFamily, setSelectedFamily] = useState("All");
  const [selectedStorage, setSelectedStorage] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Dialog & Drawer States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [disposalModalItem, setDisposalModalItem] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Sync inventory changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
    } catch (e) {
      console.error("Failed to save inventory to localStorage:", e);
    }
  }, [inventory]);

  // Sync audit history changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(disposedHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage:", e);
    }
  }, [disposedHistory]);

  // Action: Add New Medicine
  const handleAddMedicine = (newItem) => {
    setInventory((prev) => [newItem, ...prev]);
  };

  // Action: Mark Consumed
  const handleMarkConsumed = (item) => {
    const newInventory = inventory.filter((i) => i.id !== item.id);
    const logEntry = {
      id: `consumed_${Date.now()}`,
      medicineId: item.id,
      brandName: item.brandName,
      genericName: item.genericName,
      action: "CONSUMED",
      timestamp: new Date().toISOString(),
    };
    setInventory(newInventory);
    setDisposedHistory((prev) => [logEntry, ...prev]);
  };

  // Action: Confirm Safe Disposal
  const handleConfirmDisposal = (item, protocol) => {
    const newInventory = inventory.filter((i) => i.id !== item.id);
    const logEntry = {
      id: `disposed_${Date.now()}`,
      medicineId: item.id,
      brandName: item.brandName,
      genericName: item.genericName,
      action: "DISPOSED",
      protocolUsed: protocol.branchId,
      timestamp: new Date().toISOString(),
    };
    setInventory(newInventory);
    setDisposedHistory((prev) => [logEntry, ...prev]);
    setDisposalModalItem(null);
  };

  // Action: Delete Item
  const handleDeleteItem = (item) => {
    if (window.confirm(`Remove "${item.brandName}" from cabinet?`)) {
      setInventory((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  // Action: Clear Audit History
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your safe disposal and consumption audit history?")) {
      setDisposedHistory([]);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([]));
    }
  };

  // Action: Restore Backup
  const handleImportSuccess = ({ inventory: newInv, history: newHist }) => {
    if (Array.isArray(newInv)) setInventory(newInv);
    if (Array.isArray(newHist)) setDisposedHistory(newHist);
  };

  // Action: Reset Demo Cabinet
  const handleResetDemo = () => {
    const fresh = getDemoCabinetData();
    setInventory(fresh);
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(fresh));
  };

  // Action: Print Emergency Fridge Sheet
  const handlePrintFridgeSheet = () => {
    window.print();
  };

  // Filtering Logic
  const filteredInventory = inventory.filter((item) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBrand = (item.brandName || "").toLowerCase().includes(q);
      const matchGeneric = (item.genericName || "").toLowerCase().includes(q);
      const matchCategory = (item.category || "").toLowerCase().includes(q);
      const matchNotes = (item.notes || "").toLowerCase().includes(q);
      if (!matchBrand && !matchGeneric && !matchCategory && !matchNotes) {
        return false;
      }
    }

    // 2. Family Filter
    if (selectedFamily !== "All" && item.familyMember !== selectedFamily) {
      return false;
    }

    // 3. Storage Location Filter
    if (selectedStorage !== "All" && item.storageLocation !== selectedStorage) {
      return false;
    }

    // 4. Status Filter
    if (selectedStatus !== "All") {
      const statusObj = calculateExpiryStatus(
        item.expiryDate,
        item.category,
        item.openedDate,
        item.genericName,
        item.brandName
      );
      if (selectedStatus === "QUARANTINE") {
        if (statusObj.status !== "EXPIRED" && statusObj.status !== "UNKNOWN_DATE") {
          return false;
        }
      } else if (statusObj.status !== selectedStatus) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Pinned Quarantine Strip (Section 4.2.2) */}
      <QuarantineBanner
        inventory={inventory}
        onInspectOrDispose={(item) => setDisposalModalItem(item)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Top Header Command Bar (Screen Only) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                The Tactile Apothecary
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Cabinet
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Household medicine expiry surveillance &amp; deterministic safe disposal portal.
            </p>
          </div>

          {/* Global Cabinet Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Audit History Trigger */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              title="View disposal & consumption audit logs"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>History</span>
              {disposedHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {disposedHistory.length}
                </span>
              )}
            </button>

            {/* Backup / Restore Trigger */}
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              title="Export or restore cabinet data"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>Backup</span>
            </button>

            {/* Print Fridge Sheet Trigger */}
            <button
              type="button"
              onClick={handlePrintFridgeSheet}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              title="Print Emergency Fridge Sheet (A4)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Fridge Sheet</span>
            </button>

            {/* Reset Demo Trigger */}
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all"
              title="Restore standard judge demo dataset"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>

            {/* Add Medicine Trigger */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE EMERGENCY FRIDGE SHEET (Section 3.2 & Section 4)
            Visible ONLY when printing (window.print() / @media print)
            ========================================================================= */}
        <section aria-label="Printable Emergency Fridge Sheet" className="print:block hidden w-full text-slate-900">
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase">
                  EMERGENCY HOUSEHOLD MEDICINE ROSTER
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  MedSafe Portal • In-Case-of-Emergency Fridge Door Document • CDSCO WI/01/DCC-P-25 Compliant
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">Printed: {new Date().toLocaleDateString()}</p>
                <p className="text-slate-600">Total Active: {inventory.length} medicines</p>
              </div>
            </div>

            {/* Emergency Hotline Alert Box */}
            <div className="mt-3 p-2 bg-slate-100 border border-slate-300 rounded text-xs flex justify-between font-semibold">
              <span>National Emergency: 112</span>
              <span>Ambulance: 108</span>
              <span>Poison Information Centre: 1066 / 1800-116-117</span>
            </div>
          </div>

          {/* Inventory Table for Print */}
          <table className="w-full text-xs border border-slate-400 mb-6">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400 text-left font-bold">
                <th className="p-2 border-r border-slate-300 w-8">#</th>
                <th className="p-2 border-r border-slate-300">Medicine &amp; Generic Salt</th>
                <th className="p-2 border-r border-slate-300">Category</th>
                <th className="p-2 border-r border-slate-300">Profile</th>
                <th className="p-2 border-r border-slate-300">Storage Location</th>
                <th className="p-2 border-r border-slate-300">Expiry Status</th>
                <th className="p-2">Usage / In-Use Notes</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, idx) => {
                const statusObj = calculateExpiryStatus(
                  item.expiryDate,
                  item.category,
                  item.openedDate,
                  item.genericName,
                  item.brandName
                );
                return (
                  <tr key={item.id} className="border-b border-slate-300 print-break-inside-avoid">
                    <td className="p-2 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>{item.brandName}</strong>
                      {item.genericName && (
                        <div className="text-[10px] text-slate-600">{item.genericName}</div>
                      )}
                    </td>
                    <td className="p-2 border-r border-slate-300">{item.category}</td>
                    <td className="p-2 border-r border-slate-300">{item.familyMember}</td>
                    <td className="p-2 border-r border-slate-300">{item.storageLocation}</td>
                    <td className="p-2 border-r border-slate-300">
                      <strong>{item.expiryDate || "N/A"}</strong>
                      <div className="text-[10px] font-semibold">{statusObj.label}</div>
                    </td>
                    <td className="p-2 text-[10px]">
                      {item.openedDate && <span>Opened: {item.openedDate}. </span>}
                      {item.notes ? item.notes : "Standard household storage."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Emergency Contacts Sign-Off Box */}
          <div className="grid grid-cols-3 gap-3 border border-slate-300 p-3 rounded mb-4 text-xs">
            <div>
              <p className="font-bold text-slate-700">Family Doctor / Clinic:</p>
              <div className="border-b border-dotted border-slate-400 mt-4" />
            </div>
            <div>
              <p className="font-bold text-slate-700">Neighborhood 24/7 Chemist:</p>
              <div className="border-b border-dotted border-slate-400 mt-4" />
            </div>
            <div>
              <p className="font-bold text-slate-700">Emergency Family Contact:</p>
              <div className="border-b border-dotted border-slate-400 mt-4" />
            </div>
          </div>

          <p className="text-[9px] text-slate-500 italic leading-snug">
            <strong>Clinical Disclaimer:</strong> {MANDATORY_CLINICAL_DISCLAIMER}
          </p>
        </section>

        {/* Household Safety Score Header Widget (Section 4.2.1) */}
        <div className="no-print mb-8">
          <HouseholdSafetyScore
            inventory={inventory}
            disposedCount={disposedHistory.length}
            onQuarantineClick={() => setSelectedStatus("QUARANTINE")}
          />
        </div>

        {/* Filters, Search & Profile Segment Bar (Screen Only) */}
        <div className="no-print bg-white border border-slate-200/90 shadow-sm rounded-2xl p-4 mb-8 space-y-4">
          {/* Top Filter Row: Search & Storage Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by brand name, generic salt, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Storage Location Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Storage:
              </span>
              <select
                value={selectedStorage}
                onChange={(e) => setSelectedStorage(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {STORAGE_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Filter Row: Family Member Profile Tabs & Status Chips */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Family Member Profile Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Profile:
              </span>
              {FAMILY_OPTIONS.map((member) => {
                const count =
                  member === "All"
                    ? inventory.length
                    : inventory.filter((i) => i.familyMember === member).length;
                const isActive = selectedFamily === member;
                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() => setSelectedFamily(member)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    <span>{member}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-slate-800 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Status Quick Filter */}
            <div className="flex items-center space-x-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedStatus("All")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatus === "All"
                    ? "font-bold text-slate-900 bg-slate-100"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    selectedStatus === "QUARANTINE" ? "All" : "QUARANTINE"
                  )
                }
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedStatus === "QUARANTINE"
                    ? "font-bold text-rose-700 bg-rose-50 border border-rose-200"
                    : "text-rose-600 hover:bg-rose-50"
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                Quarantine
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    selectedStatus === "EXPIRING_SOON" ? "All" : "EXPIRING_SOON"
                  )
                }
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedStatus === "EXPIRING_SOON"
                    ? "font-bold text-amber-700 bg-amber-50 border border-amber-200"
                    : "text-amber-600 hover:bg-amber-50"
                }`}
              >
                <Clock className="w-3 h-3" />
                Expiring
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(
                    selectedStatus === "SAFE" ? "All" : "SAFE"
                  )
                }
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  selectedStatus === "SAFE"
                    ? "font-bold text-emerald-700 bg-emerald-50 border border-emerald-200"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Safe
              </button>
            </div>
          </div>
        </div>

        {/* Medicine Shelf Cards Grid (Screen Only) */}
        <div className="no-print">
          {filteredInventory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                <Pill className="w-7 h-7 rotate-45" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                No Medicines Found
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                No cabinet items match your active search or profile filters. Try resetting filters or adding a new medication.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFamily("All");
                    setSelectedStorage("All");
                    setSelectedStatus("All");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
                >
                  Restore Demo Cabinet
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredInventory.map((item) => (
                <MedicineCard
                  key={item.id}
                  item={item}
                  onDisposalClick={(it) => setDisposalModalItem(it)}
                  onMarkConsumed={handleMarkConsumed}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Medicine Modal (Phase 5) */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMedicine={handleAddMedicine}
      />

      {/* Safe Disposal Wizard Modal (Phase 5) */}
      <SafeDisposalModal
        isOpen={Boolean(disposalModalItem)}
        item={disposalModalItem}
        onClose={() => setDisposalModalItem(null)}
        onConfirmDisposed={handleConfirmDisposal}
      />

      {/* History Audit Drawer (Phase 6) */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={disposedHistory}
        onClearHistory={handleClearHistory}
      />

      {/* Backup & Restore Modal (Phase 6) */}
      <BackupRestore
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        inventory={inventory}
        history={disposedHistory}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
