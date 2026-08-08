"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditLog {
  log_id: string;
  timestamp: string;
  actor: "EMPLOYEE" | "CUSTOM_AGENT" | "CUSTOM_SKILL" | "APPROVER";
  action: string;
  details: string | null;
}

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

interface Claim {
  claim_id: string;
  status: string;
  manual_inputs: {
    amount: number;
    category: string;
    date: string;
    cost_center: string;
  };
  receipt_image_url: string | null;
  extracted_data: ExtractedData | null;
  evidence_packet: EvidencePacket | null;
  audit_logs?: AuditLog[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ApproverQueuePage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchClaimDetails = useCallback(async (claimId: string) => {
    setLoadingDetail(true);
    setSuccessMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/claims/${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClaim(data);
      }
    } catch (err) {
      console.error("Failed to load claim details:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchQueue = useCallback(async (autoSelectFirst = false) => {
    setLoadingQueue(true);
    try {
      const res = await fetch(`${API_BASE_URL}/claims/escalated`);
      if (res.ok) {
        const data = await res.json();
        setClaims(data);
        if (autoSelectFirst && data.length > 0) {
          fetchClaimDetails(data[0].claim_id);
        } else if (data.length === 0) {
          setSelectedClaim(null);
        }
      }
    } catch (err) {
      console.error("Failed to load claims queue:", err);
    } finally {
      setLoadingQueue(false);
    }
  }, [fetchClaimDetails]);

  const handleDecision = async (claimId: string, decision: "APPROVE" | "REJECT") => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/claims/${claimId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        setSuccessMsg(`Claim successfully ${decision === "APPROVE" ? "approved" : "rejected"}!`);
        // Refresh queue
        await fetchQueue(true);
      } else {
        alert("Failed to save decision.");
      }
    } catch (err) {
      console.error("Error decisioning claim:", err);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue(true);
  }, [fetchQueue]);

  const getActorLabel = (actor: string) => {
    switch (actor) {
      case "EMPLOYEE":
        return "Employee";
      case "CUSTOM_AGENT":
        return "Receipt Agent (AI)";
      case "CUSTOM_SKILL":
        return "Policy Skill (Engine)";
      case "APPROVER":
        return "Finance Approver";
      default:
        return actor;
    }
  };

  const getActorColor = (actor: string) => {
    switch (actor) {
      case "EMPLOYEE":
        return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
      case "CUSTOM_AGENT":
        return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
      case "CUSTOM_SKILL":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "APPROVER":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Approver Triage Queue
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Finance verification queue for claims flagged with policy anomalies.
          </p>
        </div>
        <button
          onClick={() => fetchQueue(false)}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm flex items-center gap-2 cursor-pointer active:scale-95 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow min-h-0">
        
        {/* Left Side: Claim Queue Queue (Cols 4) */}
        <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col max-h-[70vh] lg:max-h-[75vh] overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Flagged Claims ({claims.length})
            </h2>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-850 flex-grow">
            {loadingQueue ? (
              <div className="p-8 text-center text-slate-500">Loading queue...</div>
            ) : claims.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-slate-400">All caught up!</p>
                <p className="text-xs">No escalated claims require review.</p>
              </div>
            ) : (
              claims.map((claim) => (
                <div
                  key={claim.claim_id}
                  onClick={() => fetchClaimDetails(claim.claim_id)}
                  className={`p-4 cursor-pointer transition-all duration-200 ${
                    selectedClaim?.claim_id === claim.claim_id
                      ? "bg-indigo-500/10 hover:bg-indigo-500/15 border-l-4 border-indigo-500"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="font-bold text-slate-200 text-sm sm:text-base">
                      ${claim.manual_inputs.amount.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                      {claim.manual_inputs.category}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>CC: {claim.manual_inputs.cost_center}</span>
                    <span>{claim.manual_inputs.date}</span>
                  </div>
                  {claim.evidence_packet && (
                    <p className="text-xs text-amber-300/80 truncate mt-2 bg-slate-950/40 px-2 py-1 rounded border border-amber-500/5">
                      {claim.evidence_packet.explanation}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Detailed review area (Cols 8) */}
        <div className="lg:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col max-h-[90vh] lg:max-h-[75vh] overflow-hidden shadow-2xl min-w-0">
          {successMsg && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 px-6 py-3 text-sm font-semibold flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg("")} className="hover:text-emerald-300">✕</button>
            </div>
          )}

          {loadingDetail ? (
            <div className="flex-grow flex items-center justify-center text-slate-400">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading claim audit packet...</span>
              </div>
            </div>
          ) : !selectedClaim ? (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-8">
              <svg className="w-16 h-16 text-slate-800 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
              </svg>
              <p className="font-semibold text-slate-400">No Claim Selected</p>
              <p className="text-xs text-center max-w-xs mt-1">Select an escalated claim from the queue list to audit its receipt and triage trail.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-grow min-h-0 overflow-y-auto">
              
              {/* Claim Header Info */}
              <div className="p-6 border-b border-slate-850 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-555">ID: {selectedClaim.claim_id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      selectedClaim.status === "AUTO_APPROVED" || selectedClaim.status === "MANUAL_APPROVED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : selectedClaim.status === "ESCALATED"
                        ? "bg-amber-500/10 text-amber-405 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {selectedClaim.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-205 mt-1">
                    ${selectedClaim.manual_inputs.amount.toFixed(2)} — {selectedClaim.manual_inputs.category}
                  </h3>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-400 flex flex-col gap-1">
                  <span>Cost Center: <strong className="text-slate-200 font-bold">{selectedClaim.manual_inputs.cost_center}</strong></span>
                  <span>Date: <span className="font-mono text-slate-350">{selectedClaim.manual_inputs.date}</span></span>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-6 space-y-6 flex-grow">
                
                {/* Top Section Grid (Receipt vs Evidence) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Receipt View Card */}
                  <div className="bg-slate-955/40 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-start">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-4">
                      Receipt Attachment Image
                    </span>
                    
                    {selectedClaim.receipt_image_url ? (
                      <div className="flex items-center justify-center flex-grow p-4 bg-slate-950/40 border border-slate-850 rounded-xl min-h-48">
                        <div className="relative group max-w-full rounded-lg overflow-hidden border border-slate-800 shadow-lg transition-transform duration-300 hover:scale-[1.02] hover:border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedClaim.receipt_image_url.startsWith("/static") 
                              ? `${API_BASE_URL}${selectedClaim.receipt_image_url}` 
                              : selectedClaim.receipt_image_url}
                            alt="Expense Receipt"
                            className="object-contain max-h-52 w-auto"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow py-12 border border-dashed border-rose-500/10 bg-rose-500/5 rounded-xl flex flex-col items-center justify-center text-center p-4">
                        <svg className="w-10 h-10 text-rose-400/70 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-semibold text-sm text-rose-455">No Receipt Document Uploaded</span>
                        <span className="text-[11px] text-slate-555 max-w-xs mt-1">This claim was submitted without an attached receipt file.</span>
                      </div>
                    )}
                  </div>

                  {/* Evidence & Compliance Info Card */}
                  <div className="bg-slate-955/40 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-start space-y-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Evidence Verification Packet
                    </span>
                    
                    {selectedClaim.evidence_packet && (
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold text-amber-405 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Violations Detected:
                        </h4>
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {selectedClaim.evidence_packet.flagged_rule_ids.map((id) => (
                            <span key={id} className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/10">
                              {id}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-medium">
                          {selectedClaim.evidence_packet.explanation}
                        </p>
                      </div>
                    )}

                    {/* Summary Parameters Comparison */}
                    <div className="text-xs space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-850">
                      <div className="flex justify-between items-center py-1 border-b border-slate-900">
                        <span className="text-slate-400">Claimed Amount:</span>
                        <span className="font-mono font-bold text-slate-200">${selectedClaim.manual_inputs.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-900">
                        <span className="text-slate-400">Extracted Amount:</span>
                        <span className={`font-mono font-bold ${
                          selectedClaim.extracted_data?.total_amount !== selectedClaim.manual_inputs.amount 
                            ? "text-amber-400" 
                            : "text-slate-350"
                        }`}>
                          {selectedClaim.extracted_data?.total_amount 
                            ? `$${selectedClaim.extracted_data.total_amount.toFixed(2)}` 
                            : "N/A (Extraction Failed)"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-900">
                        <span className="text-slate-400">Cost Center & Category:</span>
                        <span className="text-slate-350">{selectedClaim.manual_inputs.cost_center} / {selectedClaim.manual_inputs.category}</span>
                      </div>
                      {selectedClaim.extracted_data?.confidence_score !== undefined && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-400">Agent Confidence:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono border ${
                            selectedClaim.extracted_data.confidence_score >= 0.85 
                              ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-450 border-rose-500/20"
                          }`}>
                            {(selectedClaim.extracted_data.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Bottom Row Audit Trail Card */}
                <div className="bg-slate-955/40 border border-slate-800/80 rounded-xl p-5 flex flex-col">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-4">
                    Immutable State Audit Trail
                  </span>
                  
                  <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
                    {selectedClaim.audit_logs && selectedClaim.audit_logs.length > 0 ? (
                      <div className="relative border-l border-slate-850 ml-3 space-y-5">
                        {selectedClaim.audit_logs.map((log, index) => (
                          <div key={log.log_id} className="relative pl-6">
                            {/* Dot marker */}
                            <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border border-slate-950 ${
                              index === selectedClaim.audit_logs!.length - 1 ? "bg-indigo-500 animate-pulse" : "bg-slate-700"
                            }`} />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${getActorColor(log.actor)}`}>
                                  {getActorLabel(log.actor)}
                                </span>
                                <span className="text-xs font-bold text-slate-205">
                                  {log.action.toUpperCase()}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            
                            {log.details && (
                              <p className="text-xs text-slate-400 bg-slate-950/30 px-3 py-1.5 rounded-lg border border-slate-900/60 mt-1 font-mono break-all max-w-full">
                                {log.details.length > 250 ? `${log.details.substring(0, 250)}...` : log.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-550 italic">No audit trail records found.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Buttons Footer bar */}
              <div className="p-4 border-t border-slate-855 bg-slate-950/40 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision(selectedClaim.claim_id, "REJECT")}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-455 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Reject Claim"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision(selectedClaim.claim_id, "APPROVE")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/15 active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Approve Claim"}
                </button>
              </div>
              
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
