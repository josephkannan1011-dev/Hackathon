import React, { useState, useEffect } from "react";
import { 
  Shield, Compass, MapPin, AlertTriangle, MessageSquare, History, 
  ChevronRight, Upload, Phone, Plus, Star, Bell, Image, Music, Film, Check, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Complaint, Notification } from "../types";

interface CitizenSimulatorProps {
  citizenId: string;
  setCitizenId: (id: string) => void;
  onComplaintRaised: () => void;
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  notifications: Notification[];
  fetchNotifications: () => void;
  onShowToast: (msg: string, type: "success" | "warning" | "info" | "error") => void;
}

const CITIZEN_PROFILES = [
  { id: "Citizen-X83P2A", name: "Joseph Kannan", email: "josephkannan1018@gmail.com", phone: "+91 9845012345", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" },
  { id: "Citizen-A74K9B", name: "Anita Rao", email: "anitarao@gmail.com", phone: "+91 9741098765", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" }
];

const MOCK_LANDMARKS = [
  { name: "Anna Nagar Roundtana", lat: 13.0850, lng: 80.2100 },
  { name: "T-Nagar Shopping Hub", lat: 13.0418, lng: 80.2341 },
  { name: "Guindy Industrial Estate", lat: 13.0067, lng: 80.2206 },
  { name: "Marina Beach Esplanade", lat: 13.0475, lng: 80.2824 },
  { name: "Adyar Flyover Junction", lat: 13.0012, lng: 80.2565 }
];

export default function CitizenSimulator({
  citizenId,
  setCitizenId,
  onComplaintRaised,
  complaints,
  setComplaints,
  notifications,
  fetchNotifications,
  onShowToast
}: CitizenSimulatorProps) {
  const [currentProfile, setCurrentProfile] = useState<typeof CITIZEN_PROFILES[0] | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "file" | "emergency" | "tickets" | "ai">("map");

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Road Potholes & Infrastructure");
  const [selectedLandmark, setSelectedLandmark] = useState(MOCK_LANDMARKS[1]);
  const [photoAttached, setPhotoAttached] = useState<string | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);

  // Attachment uploading state
  const [isUploading, setIsUploading] = useState(false);

  // Duplicate warning detection
  const [duplicateWarning, setDuplicateWarning] = useState<Complaint | null>(null);

  // Chat AI helper state
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "ai", text: "Vanakkam! I am your CivicLens AI. Describe any city complaint, and I will auto-fill your report form." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Auto login first user on mount so it's instantly interactive
  useEffect(() => {
    if (!currentProfile) {
      setCurrentProfile(CITIZEN_PROFILES[0]);
      setCitizenId(CITIZEN_PROFILES[0].id);
    }
  }, []);

  // Real-time Duplicate Checker
  useEffect(() => {
    if (description.length > 8) {
      const keywords = description.toLowerCase().split(" ");
      const match = complaints.find(c => {
        if (c.status === "Completed") return false;
        // Check if same category and keywords overlap
        const titleOverlap = c.title.toLowerCase().split(" ").some(w => w.length > 4 && keywords.includes(w));
        const descOverlap = c.description.toLowerCase().split(" ").some(w => w.length > 4 && keywords.includes(w));
        return (titleOverlap || descOverlap) && c.category === category;
      });
      setDuplicateWarning(match || null);
    } else {
      setDuplicateWarning(null);
    }
  }, [description, category, complaints]);

  // Handle Form Submission
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      onShowToast("Please enter a title and description.", "warning");
      return;
    }

    try {
      const payload = {
        title,
        description,
        category,
        gps: { lat: selectedLandmark.lat, lng: selectedLandmark.lng },
        address: `${selectedLandmark.name}, Chennai`,
        isEmergency,
        photoUrl: photoAttached || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80",
        citizenId: currentProfile?.id
      };

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast("Complaint registered successfully. AI classifying...", "success");
        onComplaintRaised();
        // Reset
        setTitle("");
        setDescription("");
        setPhotoAttached(null);
        setIsEmergency(false);
        setActiveTab("tickets");
      } else {
        onShowToast("Error submitting complaint.", "error");
      }
    } catch (err) {
      onShowToast("Network error submitting complaint.", "error");
    }
  };

  // Support / Upvote an existing complaint to prevent duplicates
  const handleSupportComplaint = async (cmpId: string) => {
    try {
      const res = await fetch(`/api/complaints/${cmpId}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizenId: currentProfile?.id })
      });
      if (res.ok) {
        onShowToast("Backed complaint successfully! Escalation weights updated.", "success");
        onComplaintRaised(); // Refresh list
        setDuplicateWarning(null);
      }
    } catch (e) {
      onShowToast("Network error upvoting complaint.", "error");
    }
  };

  // Quick Emergency Button
  const handleTriggerQuickEmergency = async (emergTitle: string, emergCat: string) => {
    try {
      const payload = {
        title: `🚨 Emergency: ${emergTitle}`,
        description: `This is an automated critical emergency report filed with one-click dispatch for: ${emergTitle}. High severity. Disruption is severe. Needs immediate dispatch.`,
        category: emergCat,
        gps: { lat: 13.0827, lng: 80.2707 },
        address: "Near Central Metro Interchange, Chennai",
        isEmergency: true,
        photoUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
        citizenId: currentProfile?.id
      };
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onShowToast("Emergency dispatch activated! Rapid Response Units alerted.", "error");
        onComplaintRaised();
        setActiveTab("tickets");
      }
    } catch (err) {
      onShowToast("Failed to dispatch emergency.", "error");
    }
  };

  // Simulated Media Attachment upload
  const simulateAttachment = (type: "photo" | "video" | "voice") => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      if (type === "photo") {
        setPhotoAttached("https://images.unsplash.com/photo-1599740831419-b5ce2d473078?auto=format&fit=crop&w=600&q=80");
        onShowToast("Pothole photo attached successfully.", "success");
      } else {
        onShowToast(`${type === "video" ? "Video footage" : "Voice recording"} attached successfully.`, "success");
      }
    }, 1200);
  };

  // Send message to AI chatbot
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { 
          sender: "ai", 
          text: data.reply,
          prefill: data.prefillForm
        }]);
      } else {
        setChatMessages(prev => [...prev, { sender: "ai", text: "Sorry, I am facing a connection glitch. Let me try running locally." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "ai", text: "Network issue. Please try filing manually." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const applyAIPrefill = (prefill: any) => {
    setTitle(prefill.title);
    setDescription(prefill.description);
    setCategory(prefill.category);
    setActiveTab("file");
    onShowToast("Form prefilled by CivicLens AI!", "success");
  };

  return (
    <div className="relative w-full max-w-[390px] h-[780px] rounded-[48px] border-[10px] border-slate-900 bg-[#040814] shadow-2xl overflow-hidden flex flex-col font-sans mx-auto text-slate-100">
      
      {/* Phone Camera & Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-around px-4">
        <div className="w-2.5 h-2.5 bg-slate-950 rounded-full border border-slate-800"></div>
        <div className="w-16 h-1.5 bg-slate-800 rounded-full"></div>
      </div>

      {/* Phone Status Bar */}
      <div className="bg-[#040814]/85 backdrop-blur-md text-white text-[11px] px-6 pt-7 pb-2 flex justify-between items-center z-40 select-none border-b border-white/5">
        <span className="font-semibold font-mono">08:41 AM</span>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-emerald-400 font-bold text-[9px] tracking-widest">5G</span>
          <div className="w-5 h-2.5 border border-slate-600 rounded-sm p-0.5 flex">
            <div className="w-full h-full bg-slate-400 rounded-2xs"></div>
          </div>
        </div>
      </div>

      {/* BODY WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col relative pb-6 bg-[#040814]">
        {!currentProfile ? (
          /* REGISTRATION/LOGIN SIMULATION Screen */
          <div className="flex-1 flex flex-col justify-center py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-950 text-white border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Shield className="w-9 h-9 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white font-display">CivicLens AI</h2>
              <p className="text-xs text-slate-400 mt-1">Smart Governance Decoupled Identity Portal</p>
            </div>

            <div className="space-y-3">
              {CITIZEN_PROFILES.map(p => (
                <button 
                  key={p.id}
                  onClick={() => {
                    setCurrentProfile(p);
                    setCitizenId(p.id);
                    onShowToast(`Pre-authenticated as ${p.name}.`, "success");
                  }}
                  className="w-full bg-white/5 border border-white/10 hover:border-sky-400 p-3.5 rounded-2xl flex items-center gap-3 text-left transition-all shadow-md cursor-pointer text-white"
                >
                  <img src={p.avatar} className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />
                </button>
              ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl mt-6">
              <p className="text-[9px] text-amber-200 leading-normal font-medium">
                <strong>Anonymity Guard:</strong> Citizen identities are cryptographically decoupled from complaints. Officers only view the hash ID <code>Citizen-X83P2A</code>. Only Super Admins can decrypt.
              </p>
            </div>
          </div>
        ) : (
          /* CORE APP INTERFACES WITH TABS */
          <div className="flex-1 flex flex-col h-full">
            
            {/* Citizen mini profile header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <img src={currentProfile.avatar} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                <div>
                  <h3 className="text-xs font-bold text-white leading-none font-display">{currentProfile.name}</h3>
                  <span className="text-[8px] text-slate-400 font-mono mt-1 block">Active: {currentProfile.id}</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setCurrentProfile(null);
                  setCitizenId("");
                }} 
                className="text-[10px] text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg border border-red-500/25 cursor-pointer font-bold transition-all"
              >
                Log Out
              </button>
            </div>

            {/* TAB CONTEXT DISPLAY */}
            <div className="flex-1 py-3 flex flex-col overflow-hidden">
              
              {/* TAB 1: MAP VIEW */}
              {activeTab === "map" && (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">GPS LANDMARK OVERLAY</p>
                    <p className="text-[11px] text-slate-200 mt-0.5 font-medium flex items-center gap-1 font-display">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      Virtual Grid: Chennai Metropolitan Zone
                    </p>
                  </div>

                  {/* SVG Virtual Map Container */}
                  <div className="relative w-full h-44 bg-slate-950 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center shadow-inner">
                    {/* Retro Grid background */}
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
                    
                    {/* Map Labels */}
                    <span className="absolute top-2 left-3 text-[8px] text-slate-500 font-mono">Anna Nagar Cluster</span>
                    <span className="absolute bottom-2 right-3 text-[8px] text-slate-500 font-mono">Marina Beach Radial</span>

                    {/* Render Complaint Marker Dots */}
                    {complaints.map(c => {
                      let colorClass = "bg-blue-500";
                      if (c.status === "Completed") colorClass = "bg-emerald-500";
                      else if (c.isEmergency) colorClass = "bg-red-500 animate-pulse";
                      else if (c.status === "In Progress") colorClass = "bg-amber-500";

                      // Calculate safe modular mapping on canvas
                      const hashLat = Math.abs(Math.sin(c.gps?.lat || 0) * 100);
                      const hashLng = Math.abs(Math.cos(c.gps?.lng || 0) * 100);
                      const topOffset = 20 + (hashLat % 60);
                      const leftOffset = 20 + (hashLng % 60);

                      return (
                        <div 
                          key={c.id}
                          className="absolute group cursor-pointer"
                          style={{ top: `${topOffset}%`, left: `${leftOffset}%` }}
                          onClick={() => {
                            onShowToast(`Marker ${c.id}: ${c.title}`, "info");
                          }}
                        >
                          <div className={`w-3 h-3 rounded-full border border-white ${colorClass} shadow-md`}></div>
                          <span className="absolute hidden group-hover:block whitespace-nowrap bg-slate-950 text-white text-[8px] font-bold px-1.5 py-0.5 rounded -top-6 -left-4 z-40 border border-white/15">
                            {c.id}
                          </span>
                        </div>
                      );
                    })}

                    <p className="text-[10px] text-slate-500 font-mono">Interactive GIS Map Overlay</p>
                  </div>

                  {/* List of recent complaints in the city */}
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-52 pr-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nearby Active Issues</p>
                    {complaints.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-4 italic">All clean! No active complaints recorded.</p>
                    ) : (
                      complaints.map(c => (
                        <div 
                          key={c.id} 
                          className="bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left flex justify-between items-center text-white"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] font-bold text-slate-400">{c.id}</span>
                              <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${c.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
                                {c.status}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white mt-1 truncate font-display">{c.title}</h4>
                            <p className="text-[9px] text-slate-300 truncate">{c.location?.address || c.address}</p>
                          </div>
                          
                          {/* Support Vote Button */}
                          <button 
                            onClick={() => handleSupportComplaint(c.id)}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 p-1.5 rounded-lg shrink-0 flex flex-col items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/10" />
                            <span className="text-[8px] font-bold mt-0.5">{c.supportCount}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FILE NEW REPORT */}
              {activeTab === "file" && (
                <form onSubmit={handleSubmitComplaint} className="flex-1 flex flex-col space-y-3.5 text-left max-h-[500px] overflow-y-auto pr-1">
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Complaint Category</label>
                    <select 
                      className="w-full text-xs px-3 py-2 rounded-lg border border-white/15 focus:outline-none focus:border-sky-400 bg-slate-900 text-white font-medium"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      <option value="Road Potholes & Infrastructure">Road Potholes & Infrastructure</option>
                      <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                      <option value="Street Light & Electricals">Street Light & Electricals</option>
                      <option value="Water Supply & Pipe Leakage">Water Supply & Pipe Leakage</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">GPS Landmark Pin</label>
                    <select 
                      className="w-full text-xs px-3 py-2 rounded-lg border border-white/15 focus:outline-none focus:border-sky-400 bg-slate-900 text-white font-medium"
                      value={selectedLandmark.name}
                      onChange={e => {
                        const match = MOCK_LANDMARKS.find(l => l.name === e.target.value);
                        if (match) setSelectedLandmark(match);
                      }}
                    >
                      {MOCK_LANDMARKS.map((l, idx) => (
                        <option key={idx} value={l.name}>{l.name} (Chennai)</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Short Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Broken drainage cover on main crossing"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-white/15 focus:outline-none focus:border-sky-400 bg-white/5 text-white placeholder:text-slate-500 outline-none"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Description Details</label>
                    <textarea 
                      rows={3}
                      placeholder="Describe structural failure, size, blockages, or risk hazards..."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-white/15 focus:outline-none focus:border-sky-400 bg-white/5 text-white placeholder:text-slate-500 outline-none"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />

                    {/* REAL-TIME DUPLICATE DETECTOR POPUP */}
                    <AnimatePresence>
                      {duplicateWarning && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-12 left-0 right-0 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/35 shadow-xl text-[9px] text-amber-200 flex flex-col gap-1.5 backdrop-blur-md z-40"
                        >
                          <p className="font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            DUPLICATE WARNING: Similar report found nearby!
                          </p>
                          <div className="flex items-center justify-between gap-2 border-t border-amber-500/20 pt-1.5">
                            <span className="truncate italic font-medium">"{duplicateWarning.title}"</span>
                            <button 
                              type="button"
                              onClick={() => handleSupportComplaint(duplicateWarning.id)}
                              className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded hover:bg-amber-400 shrink-0 cursor-pointer transition-colors"
                            >
                              Upvote Existing
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Dynamic media attachments panel */}
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => simulateAttachment("photo")}
                      className="py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-[10px] flex flex-col items-center justify-center cursor-pointer border border-white/10 transition-all"
                    >
                      <Image className="w-4 h-4 text-slate-300" />
                      Photo
                    </button>
                    <button 
                      type="button"
                      onClick={() => simulateAttachment("video")}
                      className="py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-[10px] flex flex-col items-center justify-center cursor-pointer border border-white/10 transition-all"
                    >
                      <Film className="w-4 h-4 text-slate-300" />
                      Video
                    </button>
                    <button 
                      type="button"
                      onClick={() => simulateAttachment("voice")}
                      className="py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-[10px] flex flex-col items-center justify-center cursor-pointer border border-white/10 transition-all"
                    >
                      <Music className="w-4 h-4 text-slate-300" />
                      Voice
                    </button>
                  </div>

                  {photoAttached && (
                    <p className="text-[8px] text-emerald-400 font-mono font-semibold">✓ Evidence image uploaded and attached.</p>
                  )}

                  <div className="flex items-center gap-2 py-1 select-none">
                    <input 
                      type="checkbox" 
                      id="emerg" 
                      checked={isEmergency}
                      onChange={e => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 text-red-500 focus:ring-0 border-white/10 bg-[#040814] rounded"
                    />
                    <label htmlFor="emerg" className="text-[10px] font-bold text-red-400 cursor-pointer uppercase font-mono tracking-wider">
                      Mark as Urgent Emergency
                    </label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    Submit Encrypted Ticket
                  </button>

                </form>
              )}

              {/* TAB 3: AI CHAT PREFILL HELPER */}
              {activeTab === "ai" && (
                <div className="flex-1 flex flex-col h-full overflow-hidden max-h-[460px]">
                  {/* Messages Scroller */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1 max-h-80">
                    {chatMessages.map((m, idx) => (
                      <div 
                        key={idx}
                        className={`flex flex-col max-w-[80%] rounded-2xl p-3 text-xs leading-normal ${
                          m.sender === "ai" 
                            ? "bg-white/5 border border-white/10 text-slate-200 mr-auto text-left" 
                            : "bg-sky-500/20 border border-sky-500/30 text-white ml-auto text-left"
                        }`}
                      >
                        <p>{m.text}</p>
                        
                        {m.prefill && (
                          <button 
                            onClick={() => applyAIPrefill(m.prefill)}
                            className="mt-2.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] rounded-lg flex items-center gap-1 self-start shadow-md transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-50" />
                            Auto-Fill Report Form
                          </button>
                        )}
                      </div>
                    ))}

                    {isTyping && (
                      <p className="text-[10px] text-slate-500 text-left italic font-mono animate-pulse">AI Agent is mapping keys...</p>
                    )}
                  </div>

                  {/* Message Form */}
                  <form onSubmit={handleSendMessage} className="mt-auto pt-2.5 flex gap-1.5 border-t border-white/10">
                    <input 
                      type="text" 
                      placeholder="Type issue (e.g. leak in Guindy)..."
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:border-sky-400 placeholder:text-slate-500 outline-none"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button 
                      type="submit"
                      className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer shadow-md transition-all"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: EMERGENCIES PANIC BUTTONS */}
              {activeTab === "emergency" && (
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-red-400 animate-pulse border border-red-500/25">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-white font-display">One-Click Smart Dispatch</h3>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1">Bypasses duplicate detection filters. Immediately triggers level 3 emergency responses.</p>
                  </div>

                  <div className="space-y-2.5">
                    <button 
                      onClick={() => handleTriggerQuickEmergency("Live Powerline Sparking", "Street Light & Electricals")}
                      className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 p-3 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Live Wire Sparking / Pole Collapse</p>
                        <p className="text-[9px] text-red-400 font-mono mt-0.5">Assigned instantly to Electricity Department</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleTriggerQuickEmergency("Toxic Chemical Dump Leak", "Garbage & Sanitation")}
                      className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 p-3 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Hazardous Chemical Overflow</p>
                        <p className="text-[9px] text-red-400 font-mono mt-0.5">Assigned instantly to Pollution Control</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleTriggerQuickEmergency("Critical Sinkhole Collapse", "Road Potholes & Infrastructure")}
                      className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 p-3 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0"></div>
                      <div>
                        <p className="text-xs font-bold text-white">Major Road / Sinkhole Collapse</p>
                        <p className="text-[9px] text-red-400 font-mono mt-0.5">Assigned instantly to Public Works Department</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: MY TICKETS & PUSH NOTIFICATION DECK */}
              {activeTab === "tickets" && (
                <div className="flex-1 flex flex-col h-full overflow-hidden max-h-[460px]">
                  
                  {/* Push Notifications Log */}
                  <div className="bg-white/5 text-slate-100 p-2.5 rounded-xl border border-white/10 space-y-1.5 shrink-0 text-left mb-3">
                    <p className="text-[8px] font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider font-mono">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Live App Notification Stream
                    </p>
                    
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-[9px] text-slate-500 font-mono italic">Waiting for department dispatch alerts...</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="bg-slate-950/60 p-1.5 rounded border border-white/5 text-[9px] leading-normal font-mono">
                            <span className="font-bold text-slate-300 block">{n.title}</span>
                            <span className="text-slate-400 mt-0.5 block">{n.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* My Raised Ticket History */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">My Active Complaints</p>
                    
                    {complaints.filter(c => c.citizenId === currentProfile.id).length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-6 italic">You have not submitted any complaints yet.</p>
                    ) : (
                      complaints.filter(c => c.citizenId === currentProfile.id).map(c => (
                        <div key={c.id} className="bg-white/5 p-3 rounded-xl border border-white/10 text-left space-y-1.5 text-white">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-bold text-slate-400">{c.id}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                              c.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-bold text-white font-display">{c.title}</h4>
                          <p className="text-[9px] text-slate-300 leading-normal">{c.description}</p>
                          
                          {/* If completed, display officer's remarks */}
                          {c.status === "Completed" && c.remarks && (
                            <div className="bg-emerald-500/5 p-2.5 rounded border border-emerald-500/15 text-[10px] text-slate-200 mt-1">
                              <p className="font-bold text-emerald-400">✓ RESOLUTION PROOF</p>
                              <p className="mt-0.5 leading-normal">"{c.remarks}"</p>
                              {c.completionPhotoUrl && (
                                <img src={c.completionPhotoUrl} className="w-full h-20 object-cover rounded mt-1.5 border border-white/10" />
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Simulated Smartphone Bottom Dock Navigation */}
            <div className="bg-[#040814]/90 backdrop-blur-md border-t border-white/10 pt-2 pb-1 flex justify-around items-center shrink-0">
              <button 
                onClick={() => setActiveTab("map")}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${activeTab === "map" ? "text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Compass className="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5">Explore</span>
              </button>

              <button 
                onClick={() => setActiveTab("file")}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${activeTab === "file" ? "text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Plus className="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5">Report</span>
              </button>

              <button 
                onClick={() => setActiveTab("ai")}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${activeTab === "ai" ? "text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5">AI Chat</span>
              </button>

              <button 
                onClick={() => setActiveTab("emergency")}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${activeTab === "emergency" ? "text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Phone className="w-5 h-5 text-red-500 animate-pulse" />
                <span className="text-[8px] font-bold mt-0.5">SOS</span>
              </button>

              <button 
                onClick={() => setActiveTab("tickets")}
                className={`flex flex-col items-center justify-center p-1 cursor-pointer transition ${activeTab === "tickets" ? "text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"}`}
              >
                <History className="w-5 h-5" />
                <span className="text-[8px] font-bold mt-0.5">History</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Smartphone Bottom Home Indicator bar */}
      <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-45 select-none"></div>

    </div>
  );
}
