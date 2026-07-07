import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, FileText, ArrowRight, Settings, Clock, RefreshCw, Layers, ShieldCheck, Filter } from 'lucide-react';
import { Complaint, Department, AuditLog } from '../types';
import AnalyticsDashboard from './AnalyticsDashboard';
import VirtualMap from './VirtualMap';

interface AdminPanelProps {
  token: string;
  analytics: any;
  complaints: Complaint[];
  departments: Department[];
  onRefreshData: () => void;
  onSelectComplaint: (id: string) => void;
  overrideActiveTab?: 'overview' | 'assignments';
}

export default function AdminPanel({
  token,
  analytics,
  complaints,
  departments,
  onRefreshData,
  onSelectComplaint,
  overrideActiveTab,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'complaints' | 'escalations' | 'logs'>('analytics');

  useEffect(() => {
    if (overrideActiveTab === 'overview') {
      setActiveTab('analytics');
    } else if (overrideActiveTab === 'assignments') {
      setActiveTab('complaints');
    }
  }, [overrideActiveTab]);
  
  // Reassignment states
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [reassignLoading, setReassignLoading] = useState<boolean>(false);

  // Time advancement demo state
  const [timeAdvanceHours, setTimeAdvanceHours] = useState<number>(12);
  const [advanceLoading, setAdvanceLoading] = useState<boolean>(false);
  const [advanceResults, setAdvanceResults] = useState<{ escalatedCount: number; details: string[] } | null>(null);

  // Filter Selection States
  const [filterState, setFilterState] = useState<string>('');
  const [filterDistrict, setFilterDistrict] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Derived filtering criteria lists
  const availableStates = Array.from(new Set(complaints.map(c => c.state).filter(Boolean))) as string[];
  const availableDistricts = Array.from(
    new Set(
      complaints
        .filter(c => !filterState || c.state === filterState)
        .map(c => c.district)
        .filter(Boolean)
    )
  ) as string[];
  const availableDepts = Array.from(new Set(complaints.map(c => c.departmentId).filter(Boolean))) as string[];
  const availableStatuses = Array.from(new Set(complaints.map(c => c.status).filter(Boolean))) as string[];

  // Execute filtering criteria
  const filteredComplaints = complaints.filter(c => {
    if (filterState && c.state !== filterState) return false;
    if (filterDistrict && c.district !== filterDistrict) return false;
    if (filterDept && c.departmentId !== filterDept) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const handleReassign = async (complaintId: string) => {
    if (!selectedDeptId) return;
    setReassignLoading(true);

    try {
      const res = await fetch(`/api/complaints/${complaintId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ departmentId: selectedDeptId })
      });

      if (!res.ok) throw new Error('Reassignment failed');

      setReassigningId(null);
      setSelectedDeptId('');
      onRefreshData();
    } catch (err) {
      console.error(err);
      alert('Error reassigning department');
    } finally {
      setReassignLoading(false);
    }
  };

  const handleAdvanceTime = async () => {
    setAdvanceLoading(true);
    setAdvanceResults(null);

    try {
      const res = await fetch('/api/demo/advance-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: timeAdvanceHours })
      });

      if (!res.ok) throw new Error('SLA simulation failed');

      const data = await res.json();
      setAdvanceResults({ escalatedCount: data.escalatedCount, details: data.details });
      onRefreshData();
    } catch (err) {
      console.error(err);
      alert('Error simulating time advancement');
    } finally {
      setAdvanceLoading(false);
    }
  };

  const escalatedComplaints = complaints.filter(c => c.isEscalated);

  const getEscalationLevelLabel = (level: number) => {
    const badges = [
      { text: 'None', class: 'bg-white/5 text-slate-400 border border-white/5' },
      { text: 'Lvl 1: Dept Head', class: 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20' },
      { text: 'Lvl 2: District Officer', class: 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/20' },
      { text: 'Lvl 3: Collector Dashboard', class: 'bg-red-500/10 text-red-400 font-bold border border-red-500/25 animate-pulse' },
    ];
    return badges[level] || { text: 'Unknown', class: 'bg-white/5 text-slate-400' };
  };

  const getStatusStyle = (status: string) => {
    const mapping: Record<string, string> = {
      new: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      verified: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
      assigned: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      inspection: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      work_started: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    };
    return mapping[status] || 'bg-white/5 text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Time Advance Simulator (Demo Helper Panel) */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/5 text-slate-100">
        <div className="space-y-1">
          <h3 className="font-bold text-sm flex items-center gap-1.5 text-sky-400 font-display">
            <Clock className="w-4.5 h-4.5 text-sky-400 animate-pulse" />
            Super Admin SLA Acceleration Simulator
          </h3>
          <p className="text-[11px] text-slate-300 leading-normal max-w-xl font-medium">
            SLA deadlines enforce automated escalations (Low: 48h, Medium: 24h, High: 12h, Critical: 2h). Use this simulator to fast-forward hours in virtual time and watch smart escalations trigger in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 bg-white/5 p-2.5 rounded-xl border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Fast-forward:</span>
          <select
            value={timeAdvanceHours}
            onChange={(e) => setTimeAdvanceHours(parseInt(e.target.value))}
            className="bg-slate-950 border border-white/15 text-white rounded px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer"
          >
            <option value={2} className="bg-slate-900 text-white">2 Hours (Critical SLA breach)</option>
            <option value={12} className="bg-slate-900 text-white">12 Hours (High SLA breach)</option>
            <option value={24} className="bg-slate-900 text-white">24 Hours (Medium SLA breach)</option>
            <option value={48} className="bg-slate-900 text-white">48 Hours (Low SLA breach)</option>
          </select>
          <button
            onClick={handleAdvanceTime}
            disabled={advanceLoading}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            {advanceLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Run SLA Simulation'}
          </button>
        </div>
      </div>

      {advanceResults && (
        <div className="bg-sky-500/10 border border-sky-500/25 p-4 rounded-xl shadow-md space-y-2 animate-fadeIn text-xs text-sky-200">
          <div className="flex items-center gap-2 text-sky-400 font-bold mb-1 font-display">
            <ShieldCheck className="w-4.5 h-4.5 text-sky-400" />
            SLA Simulation Complete!
          </div>
          <p className="text-slate-300">Simulated advance: <strong className="text-white font-semibold">{timeAdvanceHours} hours</strong>. Detected <strong className="text-white font-semibold">{advanceResults.escalatedCount} breaches</strong>.</p>
          {advanceResults.details.length > 0 ? (
            <ul className="list-disc pl-5 text-[11px] text-sky-300 space-y-1 mt-2 leading-relaxed font-mono">
              {advanceResults.details.map((detail, idx) => (
                <li key={idx} className="font-medium">{detail}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic text-[11px] mt-1 font-mono">No new complaints breached their SLAs during this time jump.</p>
          )}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-white/10 text-xs font-semibold gap-2 select-none">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'analytics' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Department Analytics
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'complaints' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          All Complaints Ledger ({filteredComplaints.length} / {complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('escalations')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'escalations' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          Active SLA Escalations ({escalatedComplaints.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'logs' ? 'border-sky-400 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          System Audit Logs
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && analytics && (
        <AnalyticsDashboard data={analytics} />
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-6">
          {/* 1. National GIS Complaint Visualization & Filter Controls */}
          <div className="glass-panel rounded-2xl p-4 shadow-xl text-slate-100 space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-white text-sm flex items-center gap-1.5 font-display">
                  <Filter className="w-4 h-4 text-sky-400" />
                  National GIS Grievance Visualizer
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Real-time geographical distribution of citizen complaints across India</p>
              </div>

              {/* Dynamic Filters panel */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                {/* State dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">State</span>
                  <select
                    value={filterState}
                    onChange={(e) => {
                      setFilterState(e.target.value);
                      setFilterDistrict(''); // Reset district if state changes
                    }}
                    className="bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">All States</option>
                    {availableStates.map(s => (
                      <option key={s} value={s} className="bg-slate-950">{s}</option>
                    ))}
                  </select>
                </div>

                {/* District dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">District</span>
                  <select
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                    className="bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">All Districts</option>
                    {availableDistricts.map(d => (
                      <option key={d} value={d} className="bg-slate-950">{d}</option>
                    ))}
                  </select>
                </div>

                {/* Department dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Department</span>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">All Departments</option>
                    {availableDepts.map(d => (
                      <option key={d} value={d} className="bg-slate-950">{d}</option>
                    ))}
                  </select>
                </div>

                {/* Status dropdown */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">Complaint Status</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">All Statuses</option>
                    {availableStatuses.map(s => (
                      <option key={s} value={s} className="bg-slate-950">{s.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Clear Filter button */}
                {(filterState || filterDistrict || filterDept || filterStatus) && (
                  <button
                    onClick={() => {
                      setFilterState('');
                      setFilterDistrict('');
                      setFilterDept('');
                      setFilterStatus('');
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 text-[10px] rounded-lg cursor-pointer transition-colors mt-4 shrink-0 font-bold self-end"
                  >
                    Clear Filter HUD
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 bg-slate-950/20">
              <VirtualMap
                complaints={filteredComplaints}
                onSelectComplaint={onSelectComplaint}
                height="h-[400px]"
              />
            </div>
          </div>

          {/* 2. Complaints Ledger Directory Table */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl text-slate-100">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <h4 className="font-semibold text-white text-xs font-display">Citizen Complaint Directory</h4>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                Showing {filteredComplaints.length} of {complaints.length} cases
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[9px] font-bold bg-white/5">
                    <th className="py-3 px-4">Dossier ID</th>
                    <th className="py-3 px-4">Title & Site</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Priority</th>
                    <th className="py-3 px-4">Escalation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        {complaints.length === 0 ? 'No complaints reported yet.' : 'No complaints match the selected filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{c.id}</td>
                      <td className="py-3 px-4 max-w-sm">
                        <p className="font-semibold text-white truncate font-display">{c.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">📍 {c.address}</p>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-300">{c.category}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold capitalize ${getStatusStyle(c.status)}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          c.priority === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          c.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          c.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${getEscalationLevelLabel(c.escalationLevel).class}`}>
                          {getEscalationLevelLabel(c.escalationLevel).text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-y-1">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectComplaint(c.id)}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white px-2.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                          >
                            Inspect
                          </button>
                          
                          {/* Reassignment trigger */}
                          {reassigningId === c.id ? (
                            <div className="flex items-center gap-1.5 animate-fadeIn">
                              <select
                                value={selectedDeptId}
                                onChange={(e) => setSelectedDeptId(e.target.value)}
                                className="bg-slate-900 border border-white/10 text-white rounded p-1 text-[10px] outline-none font-medium cursor-pointer"
                              >
                                <option value="">Reroute to...</option>
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.id} ({d.name.split(' ')[0]})</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReassign(c.id)}
                                disabled={reassignLoading || !selectedDeptId}
                                className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              >
                                Go
                              </button>
                              <button
                                onClick={() => setReassigningId(null)}
                                className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReassigningId(c.id);
                                setSelectedDeptId('');
                              }}
                              className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors"
                            >
                              Reroute
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'escalations' && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-xl text-slate-100">
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
            <h4 className="font-semibold text-red-400 text-xs flex items-center gap-1.5 font-display">
              <AlertTriangle className="w-4.5 h-4.5 text-red-400 animate-pulse" />
              SLA Breaches Requiring Senior Action
            </h4>
            <span className="bg-red-500/15 border border-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full font-mono font-bold text-[9px]">{escalatedComplaints.length} active</span>
          </div>

          <div className="divide-y divide-white/5 p-4 space-y-4">
            {escalatedComplaints.length === 0 ? (
              <div className="text-center py-10 text-slate-500 italic text-xs">
                Excellent! No complaints have breached their active SLA hours.
              </div>
            ) : (
              escalatedComplaints.map(c => (
                <div key={c.id} className="border border-red-500/15 bg-red-500/5 p-4 rounded-xl shadow-md space-y-3 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">{c.id}</span>
                      <span className="font-bold text-white text-sm font-display">{c.title}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] ${getEscalationLevelLabel(c.escalationLevel).class}`}>
                        {getEscalationLevelLabel(c.escalationLevel).text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">"{c.description}"</p>
                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 font-mono">
                      <span>📍 Address: {c.address}</span>
                      <span>⏰ Created: {new Date(c.createdAt).toLocaleString()}</span>
                      <span className="text-red-400 font-semibold">⚠️ Deadline breached: {new Date(c.slaDeadline).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      onClick={() => onSelectComplaint(c.id)}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm cursor-pointer transition-colors"
                    >
                      Inspect Dossier
                    </button>
                    <button
                      onClick={() => {
                        setReassigningId(c.id);
                        setActiveTab('complaints');
                      }}
                      className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg shadow-md cursor-pointer transition-all"
                    >
                      Reroute Department
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && analytics && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-xl text-slate-100">
          <div className="p-4 bg-white/5 border-b border-white/10">
            <h4 className="font-semibold text-white text-xs font-display">Security System Audit Ledger</h4>
          </div>
          <div className="divide-y divide-white/5 p-3 space-y-1">
            {analytics.recentLogs.map((log: AuditLog) => (
              <div key={log.id} className="p-2.5 hover:bg-white/2 text-xs flex flex-col md:flex-row md:items-start justify-between gap-2 rounded transition-all font-medium">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono bg-white/10 text-slate-200 border border-white/5 px-1.5 py-0.2 rounded font-semibold text-[9px]">{log.action}</span>
                    <span className="text-slate-200 font-semibold">{log.details}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Performed by: <strong className="text-slate-300 font-mono">{log.performedBy}</strong></p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
