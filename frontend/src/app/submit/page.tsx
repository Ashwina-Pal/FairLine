"use client";

import { useState, useRef } from "react";

interface EvidencePacket {
  is_escalated: boolean;
  flagged_rule_ids: string[];
  explanation: string;
}

interface ExtractedData {
  merchant: string;
  total_amount: number;
  date: string;
  confidence_score: number;
}

interface ClaimResult {
  claim_id: string;
  status: "PENDING" | "AUTO_APPROVED" | "ESCALATED" | "MANUAL_APPROVED" | "MANUAL_REJECTED";
  manual_inputs: {
    amount: number;
    category: string;
    date: string;
    cost_center: string;
  };
  receipt_image_url: string | null;
  extracted_data: ExtractedData | null;
  evidence_packet: EvidencePacket | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SubmitClaimPage() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Meals");
  const [date, setDate] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      alert("Invalid file format. Please upload a JPEG or PNG image.");
      return;
    }
    setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date || !costCenter) {
      alert("Please fill in all manual input fields.");
      return;
    }

    setSubmitStatus("loading");
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("category", category);
    formData.append("date", date);
    formData.append("cost_center", costCenter);
    if (file) {
      formData.append("receipt_image", file);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/claims`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server failed to process submission.");
      }

      const claimData: ClaimResult = await response.json();
      setResult(claimData);
      setSubmitStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected network error occurred.");
      setSubmitStatus("error");
    }
  };

  const handleResetForm = () => {
    setAmount("");
    setCategory("Meals");
    setDate("");
    setCostCenter("");
    setFile(null);
    setResult(null);
    setSubmitStatus("idle");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-grow flex flex-col justify-center">
      {/* Description */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-3">
          Submit Expense Claim
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto text-sm sm:text-base">
          Upload your receipt. Our Custom Agent extracts the metadata instantly, and our rules engine triages compliance.
        </p>
      </div>

      {submitStatus !== "success" ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Amount input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Amount Claimed ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>

              {/* Category Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                >
                  <option value="Meals">Meals</option>
                  <option value="Travel">Travel</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>

              {/* Cost Center */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cost Center
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENG, MKT, SALES"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value.toUpperCase())}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Receipt Image Upload Box */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Receipt File Attachment
              </label>
              
              {!file ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-500/5 shadow-inner shadow-indigo-500/10"
                      : "border-slate-850 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-md">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, or JPEG (Max 5MB)</p>
                </div>
              ) : (
                <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate max-w-xs sm:max-w-md">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {submitStatus === "error" && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm flex gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitStatus === "loading"}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitStatus === "loading" ? (
                <>
                  <svg className="animate-spin h-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Triaging Claim Compliance...</span>
                </>
              ) : (
                "Submit Claim"
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Result view screen */
        <div className="space-y-6">
          {/* Status Banner */}
          {result?.status === "AUTO_APPROVED" ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-xl shadow-emerald-950/20">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h2 className="text-xl font-bold text-emerald-400">Claim Auto-Approved</h2>
                <p className="text-slate-300 text-sm">
                  This claim conforms to standard corporate expense limits. It has been cleared for payment.
                </p>
                <div className="text-xs text-slate-500 pt-1.5 font-mono">ID: {result.claim_id}</div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-xl shadow-amber-950/20">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center sm:text-left space-y-1.5">
                <h2 className="text-xl font-bold text-amber-400">Sent for Manager Review</h2>
                <p className="text-slate-300 text-sm">
                  This claim has been flagged by the policy engine for verification and routed to the approver queue.
                </p>
                {result?.evidence_packet && (
                  <div className="mt-2.5 bg-slate-950/50 border border-amber-500/10 rounded-xl px-4 py-2.5 text-xs text-amber-300/90 text-left">
                    <span className="font-semibold block mb-0.5 uppercase tracking-wide text-[10px]">Flagged Reason:</span>
                    {result.evidence_packet.explanation}
                  </div>
                )}
                <div className="text-xs text-slate-500 pt-1.5 font-mono">ID: {result?.claim_id}</div>
              </div>
            </div>
          )}

          {/* Details Table */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Triage Details Comparison
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-4">Parameter</th>
                    <th className="py-2.5 px-4">Manual Input</th>
                    <th className="py-2.5 px-4">Extracted Data (AI Agent)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-300">Amount</td>
                    <td className="py-3 px-4 font-mono">${result?.manual_inputs.amount.toFixed(2)}</td>
                    <td className={`py-3 px-4 font-mono ${result?.extracted_data?.total_amount !== result?.manual_inputs.amount ? "text-amber-400 font-semibold" : ""}`}>
                      {result?.extracted_data?.total_amount ? `$${result.extracted_data.total_amount.toFixed(2)}` : "N/A (No receipt)"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-300">Date</td>
                    <td className="py-3 px-4 font-mono">{result?.manual_inputs.date}</td>
                    <td className="py-3 px-4 font-mono">{result?.extracted_data?.date || "N/A (No receipt)"}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-slate-300">Merchant / Info</td>
                    <td className="py-3 px-4 text-slate-400">{result?.manual_inputs.category} ({result?.manual_inputs.cost_center})</td>
                    <td className="py-3 px-4 text-slate-400">{result?.extracted_data?.merchant || "N/A (No receipt)"}</td>
                  </tr>
                  {result?.extracted_data?.confidence_score !== undefined && (
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-300">Extraction Confidence</td>
                      <td className="py-3 px-4 text-slate-500">—</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                          result.extracted_data.confidence_score >= 0.85 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {(result.extracted_data.confidence_score * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleResetForm}
                className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-200 font-semibold py-3 px-4 rounded-xl active:scale-[0.99] transition-all duration-200 cursor-pointer text-center"
              >
                Submit Another Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
