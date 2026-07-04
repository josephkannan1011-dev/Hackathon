import React, { useState } from 'react';
import { FileText, MapPin, Image, Video, Mic, CheckSquare, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import VirtualMap from './VirtualMap';
import { Complaint } from '../types';

interface ComplaintFormProps {
  token: string;
  onSuccess: (complaint: Complaint) => void;
  prefilledData?: { title: string; description: string; category: string } | null;
  onSupportDuplicate: (complaintId: string) => void;
  complaints: Complaint[];
}

const CATEGORIES = [
  'Road Potholes & Infrastructure',
  'Garbage & Sanitation',
  'Street Light & Electricals',
  'Water Supply & Leakage',
  'Environmental Pollution',
  'Public Health & Medical Services',
  'Agriculture & Rural Development'
];

const CHENNAI_NEIGHBORHOODS = [
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2100 },
  { name: 'T Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'T-Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Guindy', lat: 13.0067, lng: 80.2206 },
  { name: 'Marina Beach', lat: 13.0475, lng: 80.2824 },
  { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { name: 'Mylapore', lat: 13.0330, lng: 80.2685 },
  { name: 'Nungambakkam', lat: 13.0601, lng: 80.2442 },
  { name: 'Velachery', lat: 12.9790, lng: 80.2190 },
  { name: 'Chromepet', lat: 12.9431, lng: 80.1412 },
  { name: 'Central Station', lat: 13.0827, lng: 80.2707 },
  { name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  { name: 'Gandhi Nagar', lat: 13.0805, lng: 80.2780 },
  { name: 'Park Street', lat: 13.0835, lng: 80.2690 }
];

export default function ComplaintForm({
  token,
  onSuccess,
  prefilledData,
  onSupportDuplicate,
  complaints,
}: ComplaintFormProps) {
  const [title, setTitle] = useState(prefilledData?.title || '');
  const [description, setDescription] = useState(prefilledData?.description || '');
  const [category, setCategory] = useState(prefilledData?.category || CATEGORIES[0]);
  const [gps, setGps] = useState<{ lat: number; lng: number }>({ lat: 13.0827, lng: 80.2707 }); // Chennai default center
  const [address, setAddress] = useState('Central District Gate, Chennai');
  const [photoUrl, setPhotoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate states
  const [duplicateFound, setDuplicateFound] = useState<boolean>(false);
  const [existingComplaint, setExistingComplaint] = useState<Complaint | null>(null);

  // Simulated GPS Geolocation grabber
  const handleAutoGPS = () => {
    // Generate slight noise around central coordinate to represent citizen's actual location
    const latNoise = (Math.random() - 0.5) * 0.015;
    const lngNoise = (Math.random() - 0.5) * 0.015;
    const newGps = { lat: parseFloat((13.0827 + latNoise).toFixed(5)), lng: parseFloat((80.2707 + lngNoise).toFixed(5)) };
    
    setGps(newGps);
    
    const avenues = ['Arcot Rd', 'Anna Salai', 'OMR Road', 'GST Expressway', 'Rajaji Rd', 'Cathedral Rd'];
    const randomAve = avenues[Math.floor(Math.random() * avenues.length)];
    setAddress(`Building ${Math.floor(Math.random() * 120 + 1)}, ${randomAve}, Sector 4, Chennai`);
    setError(null);
  };

  const handleMapLocationPicked = (coords: { lat: number; lng: number }, selectedAddress: string) => {
    setGps(coords);
    setAddress(selectedAddress);
    setError(null);
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    const lower = val.toLowerCase();
    const match = CHENNAI_NEIGHBORHOODS.find(n => lower.includes(n.name.toLowerCase()));
    if (match) {
      setGps({ lat: match.lat, lng: match.lng });
    }
  };

  const handleSubmit = async (e: React.FormEvent, ignoreDuplicate: boolean = false) => {
    e.preventDefault();
    if (!termsAccepted) {
      setError('You must accept the terms and conditions.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        category,
        gps,
        address,
        photoUrl: photoUrl || undefined,
        videoUrl: videoUrl || undefined,
        voiceUrl: voiceUrl || undefined,
        isEmergency,
        ignoreDuplicate
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 409) {
        // Duplicate Found
        const dupData = await res.json();
        setDuplicateFound(true);
        setExistingComplaint(dupData.existingComplaint);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error creating complaint');
      }

      const completedComplaint = await res.json();
      onSuccess(completedComplaint);
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupportDuplicateClick = () => {
    if (existingComplaint) {
      onSupportDuplicate(existingComplaint.id);
      setDuplicateFound(false);
      setExistingComplaint(null);
    }
  };

  return (
    <div className="space-y-6">
      {duplicateFound && existingComplaint ? (
        // Duplicate Found warning card
        <div className="bg-amber-500/10 border border-amber-500/25 p-5 rounded-xl shadow-sm space-y-4 animate-fadeIn text-slate-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-400 font-display">Similar Issue Already Reported!</h4>
              <p className="text-xs text-amber-300 leading-relaxed mt-1">
                Our database detected a matching active complaint (<span className="font-mono font-semibold text-white">{existingComplaint.id}</span>) in your immediate GPS vicinity regarding this issue.
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-lg text-xs space-y-2">
            <p className="font-semibold text-white">{existingComplaint.title}</p>
            <p className="text-slate-300 italic line-clamp-2">"{existingComplaint.description}"</p>
            <p className="text-[11px] text-slate-400 font-medium">📍 {existingComplaint.address}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSupportDuplicateClick}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2 px-4 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Support (Upvote) This Existing Report
            </button>
            <button
              onClick={(e) => handleSubmit(e, true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 py-2 px-4 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Ignore & Create New Complaint Anyway
            </button>
            <button
              onClick={() => setDuplicateFound(false)}
              className="bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // Main Form
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 shadow-xl space-y-5 text-slate-100 relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <FileText className="w-5 h-5 text-sky-400 animate-pulse" />
              <div>
                <h3 className="font-semibold text-white text-sm font-display">Complaint Dossier Registration</h3>
                <p className="text-[10px] text-slate-400">Your reporting session remains strictly anonymous to officials.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-xs font-medium border border-red-500/20">
                ⚠️ {error}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Complaint Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Snapped overhead wires sparking near block entrance"
                className="w-full glass-input rounded-lg p-2.5 text-xs outline-none transition-all placeholder:text-slate-500 font-medium text-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">Comprehensive Description *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the exact issue, damage magnitude, timeline observed, and direct threats..."
                className="w-full glass-input rounded-lg p-2.5 text-xs outline-none transition-all placeholder:text-slate-500 font-medium text-white"
              />
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Target Category Mapping *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full glass-input focus:ring-2 focus:ring-sky-500 rounded-lg p-2.5 text-xs outline-none font-medium cursor-pointer text-slate-200"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Emergency Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Critical Emergency Flag</label>
                <div
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`border p-2.5 rounded-lg flex items-center gap-3 cursor-pointer select-none transition-all ${isEmergency ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                >
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={() => {}}
                    className="rounded border-white/20 text-sky-500 focus:ring-sky-500 h-4 w-4 shrink-0 pointer-events-none bg-white/5"
                  />
                  <div>
                    <span className={`text-xs font-semibold ${isEmergency ? 'text-red-400' : 'text-slate-300'}`}>
                      Active Immediate Threat
                    </span>
                    <p className="text-[9px] text-slate-400">Auto-routes to emergency collector desk with highest SLA priority.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Detection Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-sky-400" /> Geolocation Dispatch Coordinate *
                </span>
                <button
                  type="button"
                  onClick={handleAutoGPS}
                  className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 px-3 py-1 text-[10px] font-semibold rounded-lg border border-sky-500/25 transition-all flex items-center gap-1 cursor-pointer"
                >
                  📡 Auto-Detect GPS (Simulation)
                </button>
              </div>

              {/* Virtual Map Picker component */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                <VirtualMap
                  complaints={complaints}
                  interactive={true}
                  pickedGps={gps}
                  onPickLocation={handleMapLocationPicked}
                  height="h-56"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Latitude</label>
                  <input
                    type="text"
                    disabled
                    value={gps.lat}
                    className="w-full bg-white/5 border border-white/10 text-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Longitude</label>
                  <input
                    type="text"
                    disabled
                    value={gps.lng}
                    className="w-full bg-white/5 border border-white/10 text-slate-300 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Detected Node</label>
                  <div className="bg-sky-500/10 border border-sky-500/25 text-sky-400 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold font-mono tracking-tight flex items-center gap-1 leading-normal">
                    <ShieldCheck className="w-3.5 h-3.5" /> SECURE_GEO_SYNC
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">De-facto Site Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Street / Corner address of issue..."
                  className="w-full glass-input rounded-lg p-2.5 text-xs outline-none transition-all placeholder:text-slate-500 font-medium text-white"
                />
                
                {/* Visual Location Feedback Block */}
                <div className="mt-1.5 p-2 bg-slate-900/40 border border-white/5 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Active GPS Sync: <strong className="text-slate-200 font-mono">{gps.lat.toFixed(4)}°N, {gps.lng.toFixed(4)}°E</strong></span>
                  </div>
                  {CHENNAI_NEIGHBORHOODS.some(n => address.toLowerCase().includes(n.name.toLowerCase())) ? (
                    <span className="text-sky-400 font-semibold text-[10px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                      📍 Landmark Synced!
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">
                      Type areas (e.g. "Adyar", "Mylapore", "T Nagar") to auto-snap GPS coordinates.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Media Uploads Module */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-display">
                📁 Optional Multimedia Evidence Attachments
              </span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Photo Simulation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 block flex items-center gap-1">
                    <Image className="w-3.5 h-3.5 text-slate-400" /> Photo Attachment
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 glass-input rounded-lg p-2 text-[10px] outline-none font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('https://images.unsplash.com/photo-1597430138224-aa6673bf827c?auto=format&fit=crop&w=600&q=80')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Preset
                    </button>
                  </div>
                  {photoUrl && (
                    <img src={photoUrl} className="h-16 w-full object-cover rounded-md border border-white/10 animate-fadeIn" alt="Evidence" referrerPolicy="no-referrer" />
                  )}
                </div>

                {/* Video Simulation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 block flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-slate-400" /> Video Attachment
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="Paste video URL..."
                      className="flex-1 glass-input rounded-lg p-2 text-[10px] outline-none font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setVideoUrl('https://assets.mixkit.co/videos/preview/mixkit-water-leaking-from-a-rusty-pipe-40286-large.mp4')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Preset
                    </button>
                  </div>
                </div>

                {/* Voice Simulation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 block flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 text-slate-400" /> Voice Recording
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={voiceUrl}
                      onChange={(e) => setVoiceUrl(e.target.value)}
                      placeholder="Paste audio URL..."
                      className="flex-1 glass-input rounded-lg p-2 text-[10px] outline-none font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setVoiceUrl('https://example.com/voice-evidence.mp3')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="border-t border-white/10 pt-4 flex items-start gap-3 select-none">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded border-white/20 text-sky-500 focus:ring-sky-500 h-4.5 w-4.5 shrink-0 cursor-pointer mt-0.5 bg-white/5"
              />
              <label htmlFor="terms" className="text-[11px] leading-relaxed text-slate-400 cursor-pointer font-medium">
                I hereby declare that this civic report is filed in good faith regarding genuine public infrastructure damage. I understand that my personal details are stripped from officials and kept confidential, while my report will be processed by the Hybrid AI Routing Engine.
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="glass-button-primary disabled:opacity-45 text-slate-950 py-2.5 px-6 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Dispatching Citizen Report...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  File Complaint Dossier
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
