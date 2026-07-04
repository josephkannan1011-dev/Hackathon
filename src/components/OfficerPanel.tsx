import React, { useState } from 'react';
import { CheckSquare, AlertCircle, Clock, CheckCircle2, XCircle, FileText, Upload, HelpCircle, Sparkles } from 'lucide-react';
import { Complaint, ComplaintStatus } from '../types';

interface OfficerPanelProps {
  token: string;
  complaints: Complaint[];
  onRefreshData: () => void;
  onSelectComplaint: (id: string) => void;
}

export default function OfficerPanel({
  token,
  complaints,
  onRefreshData,
  onSelectComplaint,
}: OfficerPanelProps) {
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [completionPhoto, setCompletionPhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeComplaint = complaints.find(c => c.id === activeComplaintId);

  const handleUpdateStatus = async (complaintId: string, status: ComplaintStatus) => {
    // If completed, check photo requirement
    if (status === 'completed' && !remarks) {
      setActionError('Closing remarks are required to resolve a complaint.');
      return;
    }
    if (status === 'rejected' && !remarks) {
      setActionError('Remarks explaining the rejection are required.');
      return;
    }

    setLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          remarks: remarks || undefined,
          completionPhotoUrl: completionPhoto || undefined
        })
      });

      if (!res.ok) throw new Error('Status update failed');

      setActiveComplaintId(null);
      setRemarks('');
      setCompletionPhoto('');
      onRefreshData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update complaint status.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusActionButtons = (complaint: Complaint) => {
    switch (complaint.status) {
      case 'new':
        return (
          <div className="flex flex-wrap gap-2 animate-fadeIn">
            <button
              onClick={() => handleUpdateStatus(complaint.id, 'verified')}
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              Verify & Accept Complaint
            </button>
            <button
              onClick={() => {
                setActiveComplaintId(complaint.id);
                setRemarks('');
              }}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors"
            >
              Reject Report
            </button>
          </div>
        );
      case 'verified':
        return (
          <button
            onClick={() => handleUpdateStatus(complaint.id, 'inspection')}
            className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors animate-fadeIn shadow-sm"
          >
            Dispatch Inspection Crew
          </button>
        );
      case 'inspection':
        return (
          <button
            onClick={() => handleUpdateStatus(complaint.id, 'work_started')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors animate-fadeIn shadow-sm"
          >
            Mark Ground Work Started
          </button>
        );
      case 'work_started':
        return (
          <button
            onClick={() => {
              setActiveComplaintId(complaint.id);
              setRemarks('');
              setCompletionPhoto('');
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors animate-fadeIn shadow-sm"
          >
            Resolve & Close Complaint
          </button>
        );
      case 'completed':
        return (
          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> This task has been resolved.
          </span>
        );
      case 'rejected':
        return (
          <span className="text-rose-400 font-bold text-xs flex items-center gap-1">
            <XCircle className="w-4 h-4" /> This report was marked invalid.
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const mapping: Record<string, string> = {
      new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      verified: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      assigned: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      inspection: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      work_started: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
    return `px-2.5 py-0.5 rounded text-[10px] font-bold border capitalize ${mapping[status] || 'bg-white/5'}`;
  };

  return (
    <div className="space-y-6">
      {/* Active Work Flow Popup/Panel */}
      {activeComplaintId && activeComplaint && (
        <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-4 animate-scaleIn text-slate-100">
          <div className="flex items-start justify-between border-b border-white/10 pb-3">
            <div>
              <h4 className="font-bold text-white text-sm font-display">
                {activeComplaint.status === 'work_started' ? 'Resolve and File Completion' : 'Reject Citizen Dossier'}
              </h4>
              <p className="text-[10px] text-slate-400">Updating dossier <strong className="text-slate-300 font-mono">{activeComplaint.id}</strong></p>
            </div>
            <button
              onClick={() => {
                setActiveComplaintId(null);
                setRemarks('');
                setCompletionPhoto('');
                setActionError(null);
              }}
              className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          {actionError && (
            <div className="bg-red-500/10 text-red-400 p-2.5 rounded-lg text-xs font-semibold border border-red-500/20">
              ⚠️ {actionError}
            </div>
          )}

          {activeComplaint.status === 'work_started' ? (
            // Completion inputs
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Closing Resolution Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Detail exactly how the road was repaved, street light was fixed, pipe repaired..."
                  className="w-full glass-input rounded-lg p-2.5 text-xs outline-none transition-all placeholder:text-slate-500 font-medium text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Completion Photo Proof URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={completionPhoto}
                    onChange={(e) => setCompletionPhoto(e.target.value)}
                    placeholder="Paste resolved state photo URL..."
                    className="flex-1 glass-input rounded-lg p-2.5 text-xs outline-none font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCompletionPhoto('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80')}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap"
                  >
                    Preset Proof
                  </button>
                </div>
                {completionPhoto && (
                  <img src={completionPhoto} className="h-20 w-36 object-cover rounded-md border border-white/10 mt-2 animate-fadeIn" alt="Proof" referrerPolicy="no-referrer" />
                )}
              </div>

              <button
                onClick={() => handleUpdateStatus(activeComplaint.id, 'completed')}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                Submit Resolution & Notify Supporting Citizens
              </button>
            </div>
          ) : (
            // Rejection inputs
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Dossier Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Explain clearly to the citizen why this report is invalid, duplicate, or belongs elsewhere..."
                  className="w-full glass-input rounded-lg p-2.5 text-xs outline-none transition-all placeholder:text-slate-500 font-medium text-white"
                />
              </div>

              <button
                onClick={() => handleUpdateStatus(activeComplaint.id, 'rejected')}
                disabled={loading}
                className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all shadow-md"
              >
                Confirm Rejection Dispatch
              </button>
            </div>
          )}
        </div>
      )}

      {/* Department Swapper Info Card */}
      <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-xl text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm animate-fadeIn">
        <div className="space-y-0.5">
          <p className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
            <AlertCircle className="w-4.5 h-4.5" /> Departmental Boundary Isolation Active
          </p>
          <p className="text-[11px] leading-normal text-slate-300">
            You are currently accessing complaints assigned to the <strong>{complaints[0]?.departmentId || 'your active'}</strong> department. 
            Complaints are strictly partitioned to protect civic workflow isolation.
          </p>
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          Use the <strong>Demo Roles selector</strong> in the top header to easily swap represented departments!
        </div>
      </div>

      {/* Main Ledger list of assigned tasks */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl text-slate-100">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-white text-xs font-display">Departmental Assigned Complaint Registry</h4>
            <p className="text-[10px] text-slate-400">Strict Anonymity Filter Active: Supporter Profiles Locked</p>
          </div>
          <span className="bg-white/10 text-sky-400 border border-white/10 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold">
            {complaints.length} tasks
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {complaints.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Superb! There are no pending complaints assigned to your department.
            </div>
          ) : (
            complaints.map(c => (
              <div key={c.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/2 transition-all">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono bg-white/10 text-sky-400 border border-white/5 px-2 py-0.5 rounded text-[10px] font-bold">{c.id}</span>
                    <h5 className="font-bold text-white text-sm font-display">{c.title}</h5>
                    <span className={getStatusBadge(c.status)}>{c.status.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold border capitalize ${
                      c.priority === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      c.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      c.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {c.priority}
                    </span>
                    {c.isEscalated && (
                      <span className="bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded animate-pulse">SLA BREACHED ESCALATED</span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-normal line-clamp-2">{c.description}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-mono">
                    <span>📍 Address: {c.address}</span>
                    <span className="text-slate-200 font-semibold bg-white/5 border border-white/5 px-1.5 py-0.2 rounded">👤 Citizen: {c.supporters[0] || 'Citizen-Anon'}</span>
                    <span>📈 Support count: {c.supportersCount}</span>
                    <span>⏰ Deadline: {new Date(c.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(c.slaDeadline).toLocaleDateString()})</span>
                  </div>
                </div>

                {/* Operations & actions */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <button
                    onClick={() => onSelectComplaint(c.id)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  >
                    View Details
                  </button>
                  {getStatusActionButtons(c)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
