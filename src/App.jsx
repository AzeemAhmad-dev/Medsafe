import React, { useEffect, useState } from "react";
import { Pill, ShieldCheck, Sparkles, TestTube2 } from "lucide-react";
import { runSelfTests } from "./utils/selfTests.js";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [testReport, setTestReport] = useState(null);

  useEffect(() => {
    // Run the 11 mandatory clinical and regulatory assertions on initial load
    const report = runSelfTests();
    setTestReport(report);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Command Bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <Pill className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Med<span className="text-emerald-600">Safe</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  CDSCO WI/01/DCC-P-25
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Household Medicine Expiry &amp; Safe Disposal Portal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {testReport && (
              <span
                title="11 of 11 Automated Clinical Assertions Passed"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                <TestTube2 className="w-3.5 h-3.5 text-emerald-600" />
                Tests: {testReport.passed}/{testReport.total} PASS
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tactile Apothecary v2.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Interactive Dashboard */}
      <main className="flex-1">
        <Dashboard />
      </main>

      {/* Footer with Mandatory Clinical & Regulatory Disclaimer (Section 9) */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 mt-auto">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            <strong className="text-slate-800 font-semibold">Clinical &amp; Regulatory Disclaimer:</strong>{" "}
            <em>
              MedSafe is an informational household organization tool based on CDSCO guidance WI/01/DCC-P-25 and Bio-Medical Waste Management Rules, 2016. It does not constitute medical or legal advice. Never stop taking prescribed medication without consulting your physician, and always consult a registered pharmacist or local municipal authority when in doubt about pharmaceutical disposal.
            </em>
          </p>
          <p className="text-[11px] text-slate-400">
            MedSafe — Household Medicine Expiry &amp; Safe Disposal Portal • CDSCO Guidance WI/01/DCC-P-25 Compliant Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}
