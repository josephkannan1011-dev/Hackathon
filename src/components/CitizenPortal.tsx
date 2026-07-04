import React, { useState } from 'react';
import { Plus, ShieldAlert, Sparkles, MapPin, HelpCircle, FileText, CheckCircle2, Clock, Users, ArrowRight, Bell, Bot } from 'lucide-react';
import { Complaint, User } from '../types';
import VirtualMap from './VirtualMap';
import ComplaintForm from './ComplaintForm';
import ChatBot from './ChatBot';

interface CitizenPortalProps {
  token: string;
  user: User;
  complaints: Complaint[];
  onRefreshData: () => void;
  onSelectComplaint: (id: string) => void;
  onSupportComplaint: (id: string) => void;
}

export default function CitizenPortal({
  token,
  user,
  complaints,
  onRefreshData,
  onSelectComplaint,
  onSupportComplaint,
}: CitizenPortalProps) {
  const [activeTab, setActiveTab] = useState<'nearby' | 'history' | 'emergency' | 'chatbot'>('nearby');
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [prefillForm, setPrefillForm] = useState<{ title: string; description: string; category: string } | null>(null);

  const [emergencyLoading, setEmergencyLoading] = useState<string | null>(null);

  // My reported complaints (where citizen is the original reporter, i.e., supporters[0] === user.id)
  const myComplaints = complaints.filter(c => c.supporters[0] === user.id);

  // Quick emergency dispatcher
  const triggerQuickEmergency = async (title: string, category: string) => {
    setEmergencyLoading(title);
    try {
      // Chennai central mock coordinate
      const emergencyGps = { lat: 13.0827, lng: 80.2707 };
      const emergencyAddress = 'Near General Central Metro Interchange, Chennai';

      const payload = {
        title: `🚨 Emergency: ${title}`,
        description: `This is an automated critical emergency report filed with one-click dispatch for: ${title}. High severity. Disruption is severe. Needs immediate dispatch.`,
        category,
        gps: emergencyGps,
        address: emergencyAddress,
        isEmergency: true,
        ignoreDuplicate: true // Emergencies bypass duplicates for safety
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Emergency dispatch failed');

      onRefreshData();
      setActiveTab('history');
      setShowRaiseForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch emergency response team.');
    } finally {
      setEmergencyLoading(null);
    }
  };

  const handleSupportDuplicate = (id: string) => {
    onSupportComplaint(id);
    setActiveTab('nearby');
    setShowRaiseForm(false);
  };

  const handlePrefillOpen = (data: { title: string; description: string; category: string }) => {
    setPrefillForm(data);
    setShowRaiseForm(true);
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
    return `px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${mapping[status] || 'bg-white/5'}`;
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Jumbotron Header */}
      <div className="bg-gradient-to-r from-sky-950/40 to-slate-950/40 border border-white/10 rounded-2xl p-6 text-white shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <span className="bg-sky-500/15 text-sky-400 border border-sky-500/25 text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
            Secured Citizen Access Node
          </span>
          <h2 className="text-xl font-bold font-display text-white">Smart Governance Dashboard</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            You are logged in anonymously as <strong className="text-sky-400 font-mono">{user.id}</strong>. Real identity details are strictly encrypted and hidden from government department officers. Only Super Admin has access for legal verification.
          </p>
        </div>

        <div className="flex gap-2.5 shrink-0 w-full md:w-auto relative z-10">
          <button
            onClick={() => {
              setPrefillForm(null);
              setShowRaiseForm(!showRaiseForm);
            }}
            className="flex-1 md:flex-none glass-button-primary text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            {showRaiseForm ? 'View GIS Map' : (
              <>
                <Plus className="w-4.5 h-4.5 font-bold text-white" />
                Report Civic Problem
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('emergency');
              setShowRaiseForm(false);
            }}
            className="flex-1 md:flex-none bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-red-500/30"
          >
            <ShieldAlert className="w-4.5 h-4.5 text-red-400 animate-pulse" />
            1-Click Emergency
          </button>
        </div>
      </div>

      {showRaiseForm ? (
        <ComplaintForm
          token={token}
          onSuccess={(complaint) => {
            onRefreshData();
            setShowRaiseForm(false);
            setActiveTab('history');
          }}
          prefilledData={prefillForm}
          onSupportDuplicate={handleSupportDuplicate}
          complaints={complaints}
        />
      ) : (
        <>
          {/* Tabs switch */}
          <div className="flex border-b border-white/10 text-xs font-semibold gap-2 select-none">
            <button
              onClick={() => setActiveTab('nearby')}
              className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'nearby' ? 'border-sky-500 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Nearby Active Concerns
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'history' ? 'border-sky-500 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Dossier History Timeline ({myComplaints.length})
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'chatbot' ? 'border-sky-500 text-sky-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              Consult AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('emergency')}
              className={`pb-2.5 px-4 transition-all border-b-2 cursor-pointer ${activeTab === 'emergency' ? 'border-red-500 text-red-400 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
            >
              SLA Emergency Dispatch
            </button>
          </div>

          {/* Nearby map and markers */}
          {activeTab === 'nearby' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm font-display">Interactive GIS Neighborhood Map</h3>
                  <p className="text-[10px] text-slate-400">Click markers to inspect details, view completion proof images, or upvote to support local action.</p>
                </div>
              </div>
              <div className="glass-panel p-2.5 rounded-2xl overflow-hidden shadow-lg">
                <VirtualMap
                  complaints={complaints}
                  onSelectComplaint={onSelectComplaint}
                  height="h-96"
                />
              </div>
            </div>
          )}

          {/* Complaint history and timeline tracker */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-white">My Reported Dossiers list</span>
                <span className="text-slate-400">Chronological list of cases authored by {user.id}</span>
              </div>

              {myComplaints.length === 0 ? (
                <div className="glass-card py-12 text-center rounded-xl text-slate-400 text-xs italic">
                  You have not authored any civic complaints yet. Click "Report Civic Problem" to submit your first case.
                </div>
              ) : (
                <div className="space-y-4">
                  {myComplaints.map(c => (
                    <div key={c.id} className="glass-card glass-card-hover rounded-xl p-4 shadow-md space-y-3.5 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-white/10 text-sky-400 border border-white/5 px-2 py-0.5 rounded text-[10px] font-bold">{c.id}</span>
                          <span className="font-bold text-white text-sm font-display">{c.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadge(c.status)}>{c.status.replace('_', ' ')}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-normal">{c.description}</p>

                      {/* Timeline flow chart */}
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-[10px]">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-sans text-[9px]">Dossier Resolution SLA Tracker:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center select-none text-[10px] font-bold">
                          {/* Step 1 */}
                          <div className={`p-1.5 rounded ${['new', 'verified', 'assigned', 'inspection', 'work_started', 'completed'].includes(c.status) ? 'bg-sky-500/20 text-sky-300 border border-sky-500/20' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
                            Submitted
                          </div>
                          {/* Step 2 */}
                          <div className={`p-1.5 rounded ${['verified', 'assigned', 'inspection', 'work_started', 'completed'].includes(c.status) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
                            Accepted
                          </div>
                          {/* Step 3 */}
                          <div className={`p-1.5 rounded ${['inspection', 'work_started', 'completed'].includes(c.status) ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
                            Inspection
                          </div>
                          {/* Step 4 */}
                          <div className={`p-1.5 rounded ${['work_started', 'completed'].includes(c.status) ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
                            Work Started
                          </div>
                          {/* Step 5 */}
                          <div className={`p-1.5 rounded ${c.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 'bg-white/5 text-slate-500 border border-transparent'}`}>
                            Completed
                          </div>
                        </div>

                        {c.remarks && (
                          <div className="mt-3 bg-white/5 border border-white/5 p-2.5 rounded text-xs space-y-1">
                            <span className="font-bold text-white block">👮 Officer Closing Notes:</span>
                            <p className="text-slate-300 italic">"{c.remarks}"</p>
                            {c.completionPhotoUrl && (
                              <img src={c.completionPhotoUrl} className="h-28 w-44 object-cover rounded border border-white/10 mt-1.5" alt="Proof" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono gap-2 pt-2 border-t border-white/5">
                        <span>📍 Location: {c.address}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-300">Supports: {c.supportersCount}</span>
                          <button
                            onClick={() => onSelectComplaint(c.id)}
                            className="text-sky-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            Dossier Inspection <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Assistant chat component */}
          {activeTab === 'chatbot' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white text-sm font-display">AI Consulting Assistant</h3>
                <p className="text-[10px] text-slate-400">Describe what you observe, and CivicLens AI will guide you to pre-fill standard templates.</p>
              </div>
              <ChatBot onPrefillComplaint={handlePrefillOpen} />
            </div>
          )}

          {/* Emergency reports */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 text-xs leading-normal">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-red-400 font-display">SLA Critical Emergency Hotline</h4>
                  <p className="text-red-300 mt-1">
                    Clicking a trigger button immediately dispatches a highly-escalated critical complaint docket. This is autorouted with a <strong className="text-red-200">2-Hour SLA resolution window</strong> directly monitored by the District Collector. Please use ONLY for genuine active hazards.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: 'Local Wildfire / Active Fire hazard', category: 'Environmental Pollution', desc: 'Active structural, electrical, or land fire spreading hazard.' },
                  { title: 'Severe Flood / Drainage Blockage', category: 'Water Supply & Leakage', desc: 'Critical water main burst causing fast localized flooding threat.' },
                  { title: 'Major Bridge Damage / Structural Crack', category: 'Road Potholes & Infrastructure', desc: 'Spotted visible shear structural collapse risk on bridges/overpasses.' },
                  { title: 'Sewer Backflow / Building Collapse', category: 'Garbage & Sanitation', desc: 'Sinkhole or building masonry collapse threat of public spaces.' },
                  { title: 'Fallen Trees Blockading High Traffic Avenue', category: 'Road Potholes & Infrastructure', desc: 'Massive tree blocking high speed main arterial roads causing danger.' },
                  { title: 'Overhead snapped cables active sparking risk', category: 'Street Light & Electricals', desc: 'Hanging live wiring sparking actively near school/gate pathway.' },
                ].map(item => (
                  <div key={item.title} className="glass-card p-4 rounded-xl shadow-md flex flex-col justify-between gap-3 border border-white/5 hover:border-red-500/30 transition-all">
                    <div className="space-y-1">
                      <h5 className="font-bold text-white text-xs font-display">{item.title}</h5>
                      <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                    </div>
                    <button
                      disabled={emergencyLoading !== null}
                      onClick={() => triggerQuickEmergency(item.title, item.category)}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold text-xs py-2 px-3 rounded-lg border border-red-500/20 cursor-pointer transition-colors flex items-center justify-center gap-1"
                    >
                      {emergencyLoading === item.title ? 'Dispatching...' : '🚨 Trigger Dispatch'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
