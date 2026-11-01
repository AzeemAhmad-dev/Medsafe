import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pill,
  Search,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Loader2,
} from "lucide-react";

import {
  OFFLINE_DRUG_DICTIONARY,
  normalizeDrugText,
} from "../data/medicalDatasets.js";
import {
  mapApiFormToCategory,
  identifyMedicineComposition,
} from "../utils/disposalEngine.js";

const CATEGORIES = [
  "Tablet",
  "Syrup",
  "Reconstituted Syrup",
  "Pressurized Inhaler",
  "Dry Powder Inhaler",
  "Drops",
  "Topical",
  "Syringe",
  "Insulin Pen",
];

const FAMILY_MEMBERS = ["Adults", "Kids", "Seniors", "Pets"];
const STORAGE_LOCATIONS = [
  "First-Aid Box",
  "Bedroom Drawer",
  "Fridge Door",
  "Top Shelf",
];

const MONTHS = [
  { value: "01", label: "01 (Jan)" },
  { value: "02", label: "02 (Feb)" },
  { value: "03", label: "03 (Mar)" },
  { value: "04", label: "04 (Apr)" },
  { value: "05", label: "05 (May)" },
  { value: "06", label: "06 (Jun)" },
  { value: "07", label: "07 (Jul)" },
  { value: "08", label: "08 (Aug)" },
  { value: "09", label: "09 (Sep)" },
  { value: "10", label: "10 (Oct)" },
  { value: "11", label: "11 (Nov)" },
  { value: "12", label: "12 (Dec)" },
];

// Generates years from current year to +12 years (2024–2036)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 13 }, (_, i) => String(currentYear + i));

export default function AddMedicineModal({ isOpen, onClose, onAddMedicine }) {
  // Form State
  const [brandName, setBrandName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("Tablet");
  const [quantity, setQuantity] = useState("10 Tablets");
  const [familyMember, setFamilyMember] = useState("Adults");
  const [storageLocation, setStorageLocation] = useState("First-Aid Box");
  const [openedDate, setOpenedDate] = useState("");
  const [notes, setNotes] = useState("");

  // Expiry UI Mode: 'strip' (Month/Year dropdowns) vs 'exact' (YYYY-MM-DD datepicker)
  const [expiryMode, setExpiryMode] = useState("strip");
  const [expiryMonth, setExpiryMonth] = useState("12");
  const [expiryYear, setExpiryYear] = useState(String(currentYear + 1));
  const [exactExpiryDate, setExactExpiryDate] = useState("");

  // Live Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Dosage Form Disambiguation Prompt State
  const [pendingDisambiguation, setPendingDisambiguation] = useState(null);

  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Evaluate composition identification for Unrecognised Medicine Guard (Section 6.1)
  const composition = identifyMedicineComposition(brandName, genericName, category);
  const showUnidentifiedWarning =
    brandName.trim().length >= 2 && !composition.isIdentified;

  // Handle Autocomplete Search (300ms debounce, NIH RxTerms API with 2.5s AbortController timeout)
  useEffect(() => {
    const trimmed = brandName.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoadingApi(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoadingApi(true);

      // Cancel any ongoing fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 1. Search Offline Dictionary first for immediate Indian/Global matches
      const normInput = normalizeDrugText(trimmed);
      const offlineMatches = OFFLINE_DRUG_DICTIONARY.filter((item) => {
        const normBrand = normalizeDrugText(item.brandName);
        const normGen = normalizeDrugText(item.genericName);
        return normBrand.includes(normInput) || normGen.includes(normInput);
      }).map((item) => ({
        source: "offline",
        brandName: item.brandName,
        genericName: item.genericName,
        category: item.category,
        displayText: `${item.brandName} • ${item.genericName} (${item.category})`,
      }));

      // 2. Fetch NIH / NLM RxTerms API with strict 2.5s timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 2500);

      try {
        const endpoint = `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(
          trimmed
        )}&ef=STRENGTHS_AND_FORMS,RXCUIS&maxList=6`;

        const response = await fetch(endpoint, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          // NIH RxTerms format: [total, [displayNames], { STRENGTHS_AND_FORMS: [...] }, ...]
          const apiDisplayNames = Array.isArray(data[1]) ? data[1] : [];
          const apiStrengths = data[2]?.STRENGTHS_AND_FORMS || [];

          const apiMatches = apiDisplayNames.map((fullName, idx) => {
            // e.g. "Amoxicillin (Oral Pill)"
            const match = fullName.match(/^(.*?)(?:\s*\((.*?)\))?$/);
            const cleanName = match ? match[1] : fullName;
            const apiForm = match && match[2] ? match[2] : "";
            const forms = apiStrengths[idx] || [];
            const sampleStrength = forms.length > 0 ? forms[0] : "";

            return {
              source: "nih_rxterms",
              brandName: cleanName,
              genericName: sampleStrength ? `${cleanName} (${sampleStrength})` : cleanName,
              apiForm,
              displayText: `${cleanName} ${apiForm ? `(${apiForm})` : ""}${sampleStrength ? ` • ${sampleStrength}` : ""}`,
            };
          });

          // Merge: Put offline verified matches first, then live API results (deduplicating by normalized name)
          const seen = new Set();
          const combined = [];
          for (const item of [...offlineMatches, ...apiMatches]) {
            const key = normalizeDrugText(item.brandName);
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(item);
            }
          }

          setSuggestions(combined.slice(0, 8));
        } else {
          // Non-200: silent fallback to offline dictionary
          setSuggestions(offlineMatches);
        }
      } catch (err) {
        // Abort / Network failure: silent fallback to offline dictionary
        setSuggestions(offlineMatches);
      } finally {
        setIsLoadingApi(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [brandName]);

  // Handle selecting an autocomplete suggestion
  const handleSelectSuggestion = (item) => {
    setBrandName(item.brandName);
    if (item.genericName) {
      setGenericName(item.genericName);
    }

    if (item.source === "offline") {
      setCategory(item.category);
      setShowSuggestions(false);
      return;
    }

    // NIH RxTerms suggestion: map dosage form via mapApiFormToCategory rules
    const apiForm = item.apiForm || "";
    const lowerForm = apiForm.toLowerCase();

    // Check if disambiguation prompt is needed:
    if (lowerForm.includes("liquid") || lowerForm.includes("suspension")) {
      // Prompt: "Is this a powder you mixed with water?"
      setPendingDisambiguation({
        type: "liquid",
        item,
        question: "Is this liquid a dry powder that was mixed with sterile water at the pharmacy?",
        optionA: { label: "Yes, powder mixed with water", category: "Reconstituted Syrup" },
        optionB: { label: "No, standard liquid syrup", category: "Syrup" },
      });
      setShowSuggestions(false);
      return;
    }

    if (lowerForm.includes("injectable")) {
      if (/\binsulin\b/i.test(`${item.brandName} ${item.genericName}`)) {
        setCategory("Insulin Pen");
        setShowSuggestions(false);
        return;
      }
      setPendingDisambiguation({
        type: "injectable",
        item,
        question: "Is this injectable a pre-filled pen/cartridge or a vial/syringe?",
        optionA: { label: "Pre-filled Pen or Cartridge", category: "Insulin Pen" },
        optionB: { label: "Standard Vial & Syringe", category: "Syringe" },
      });
      setShowSuggestions(false);
      return;
    }

    if (lowerForm.includes("inhaler")) {
      setPendingDisambiguation({
        type: "inhaler",
        item,
        question: "Is this inhaler a pressurized spray canister or a dry powder capsule?",
        optionA: { label: "Spray Canister (Pressurized)", category: "Pressurized Inhaler" },
        optionB: { label: "Dry Powder Capsule (Rotacap)", category: "Dry Powder Inhaler" },
      });
      setShowSuggestions(false);
      return;
    }

    // Automatic direct mapping
    const resolvedCategory = mapApiFormToCategory(apiForm, item.brandName, null);
    setCategory(resolvedCategory);
    setShowSuggestions(false);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!brandName.trim()) {
      alert("Please enter a medicine brand or generic name.");
      return;
    }

    // Format Expiry Date according to mode
    let finalExpiryDate = "";
    if (expiryMode === "strip") {
      finalExpiryDate = `${expiryMonth}/${expiryYear}`;
    } else {
      finalExpiryDate = exactExpiryDate.trim();
      if (!finalExpiryDate) {
        alert("Please select a valid expiry date.");
        return;
      }
    }

    const newItem = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      brandName: brandName.trim(),
      genericName: genericName.trim(),
      category,
      familyMember,
      storageLocation,
      quantity: quantity.trim() || "1 Unit",
      openedDate: openedDate.trim(),
      expiryDate: finalExpiryDate,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddMedicine(newItem);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setBrandName("");
    setGenericName("");
    setCategory("Tablet");
    setQuantity("10 Tablets");
    setFamilyMember("Adults");
    setStorageLocation("First-Aid Box");
    setOpenedDate("");
    setNotes("");
    setExpiryMode("strip");
    setExpiryMonth("12");
    setExpiryYear(String(currentYear + 1));
    setExactExpiryDate("");
    setSuggestions([]);
    setShowSuggestions(false);
    setPendingDisambiguation(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Top Decorative Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Pill className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add Medicine</h2>
              <p className="text-xs text-slate-500">
                Log household medicine with CDSCO guidance &amp; live NIH RxTerms lookup.
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brand Name with Live Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Medicine Brand / Commercial Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Dolo 650, Augmentin, Tramazac, Cifran, Lantus..."
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isLoadingApi ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown List */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  <span>Verified Dictionary &amp; NIH RxTerms</span>
                  <span className="text-[9px] text-emerald-600">Click to autofill</span>
                </div>
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/80 transition-colors border-b border-slate-50 last:border-b-0 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{sug.brandName}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{sug.displayText}</p>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        sug.source === "offline"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {sug.source === "offline" ? "India / Offline" : "NIH RxTerms"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generic Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Active Salt / Generic Composition
            </label>
            <input
              type="text"
              placeholder="e.g. Paracetamol 650mg, Amoxicillin & Clavulanate, Tramadol..."
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all"
            />
          </div>

          {/* Unrecognised Medicine Guard (Section 6.1) */}
          {showUnidentifiedWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Unrecognised Medicine Composition</p>
                <p className="mt-0.5 leading-relaxed">
                  We could not identify this medicine. Check the salt/composition printed on the strip and enter it.
                </p>
              </div>
            </div>
          )}

          {/* Dosage Form Disambiguation Prompt Callout */}
          {pendingDisambiguation && (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 text-xs space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-sky-900">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Form Clarification Needed</span>
              </div>
              <p className="leading-relaxed">{pendingDisambiguation.question}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategory(pendingDisambiguation.optionA.category);
                    setPendingDisambiguation(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors text-xs"
                >
                  {pendingDisambiguation.optionA.label}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(pendingDisambiguation.optionB.category);
                    setPendingDisambiguation(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-sky-800 font-semibold hover:bg-sky-100 transition-colors text-xs"
                >
                  {pendingDisambiguation.optionB.label}
                </button>
              </div>
            </div>
          )}

          {/* Category & Quantity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dosage Form Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantity / Pack Size
              </label>
              <input
                type="text"
                placeholder="e.g. 10 Tablets, 1 Bottle (60ml), 1 Pen"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          {/* Family Member & Storage Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Family Member Profile
              </label>
              <select
                value={familyMember}
                onChange={(e) => setFamilyMember(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              >
                {FAMILY_MEMBERS.map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Storage Location
              </label>
              <select
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
              >
                {STORAGE_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry Date Entry UI (Section 5.2) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              {/* Toggle Mode Button */}
              <button
                type="button"
                onClick={() => setExpiryMode(expiryMode === "strip" ? "exact" : "strip")}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                <span>
                  Switch to {expiryMode === "strip" ? "Exact Date (YYYY-MM-DD)" : "Blister Strip (MM/YYYY)"}
                </span>
              </button>
            </div>

            {expiryMode === "strip" ? (
              <div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Blister Strip Standard: Select Month &amp; Year printed on strip (resolves to last calendar day of that month).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Expiry Month
                    </label>
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Expiry Year
                    </label>
                    <select
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Exact Calendar Expiry Date:
                </p>
                <input
                  type="date"
                  value={exactExpiryDate}
                  onChange={(e) => setExactExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                />
              </div>
            )}
          </div>

          {/* Optional In-Use Opened Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Date Opened / Reconstituted (Optional)
              </label>
              {(category === "Drops" ||
                category === "Insulin Pen" ||
                category === "Reconstituted Syrup" ||
                /insulin/i.test(`${brandName} ${genericName}`)) && (
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Clinical In-Use Override Active
                </span>
              )}
            </div>
            <input
              type="date"
              value={openedDate}
              onChange={(e) => setOpenedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Required for eye drops (max 28d), opened insulin (max 28d), and dry pediatric syrups (max 14d).
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Usage Instructions / Physician Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Take after meals; store in cool dry drawer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save to Cabinet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
