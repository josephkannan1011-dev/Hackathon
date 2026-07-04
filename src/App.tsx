import React, { useState, useEffect } from 'react';
import {
  Shield, Bell, LogOut, User, RefreshCw, Layers, MapPin, CheckSquare,
  AlertOctagon, FileText, Bot, HelpCircle, Users, CheckCircle2, XCircle,
  Clock, ShieldCheck, ChevronRight, CornerDownRight, Sparkles, Upload, AlertTriangle
} from 'lucide-react';
import { User as UserType, Complaint, Department, Notification } from './types';
import Header from './components/Header';
import CitizenPortal from './components/CitizenPortal';
import OfficerPanel from './components/OfficerPanel';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('civiclens_token'));

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('civiclens_theme') as 'dark' | 'light') || 'dark'
  );

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('civiclens_theme', nextTheme);
  };

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Main system data
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Selected Detail Modal state
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaintDetails, setSelectedComplaintDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Quick Switch simulation swapper
  const handleQuickRoleSwitch = async (role: 'citizen' | 'officer' | 'admin', departmentId?: string) => {
    setAuthLoading(true);
    setAuthError(null);

    let targetEmail = 'citizen@gmail.com';
    let targetPass = 'citizen123';

    if (role === 'admin') {
      targetEmail = 'admin@civiclens.gov';
      targetPass = 'admin123';
    } else if (role === 'officer') {
      const activeDept = departmentId || 'PWD';
      targetEmail = `officer_${activeDept.toLowerCase()}@civiclens.gov`;
      targetPass = 'password123';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass })
      });

      if (!res.ok) throw new Error('Login simulation failed');

      const data = await res.json();
      localStorage.setItem('civiclens_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSelectedComplaintId(null);
    } catch (err) {
      console.error(err);
      setAuthError('Switch simulation failed. Please refresh database.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Perform full fresh reload of app states
  const refreshAllStates = async () => {
    if (!token) return;
    setLoadingData(true);

    try {
      // 1. Fetch departments
      const deptRes = await fetch('/api/departments');
      if (deptRes.ok) {
        const depts = await deptRes.json();
        setDepartments(depts);
      }

      // 2. Fetch complaints (filtered automatically in backend based on role)
      const compRes = await fetch('/api/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (compRes.ok) {
        const comps = await compRes.json();
        setComplaints(comps);
      }

      // 3. Fetch notifications
      const notifRes = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setNotifications(notifs);
      }

      // 4. Fetch analytics if Admin
      if (user?.role === 'admin') {
        const analyticsRes = await fetch('/api/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (analyticsRes.ok) {
          const stats = await analyticsRes.json();
          setAnalytics(stats);
        }
      }
    } catch (err) {
      console.error('Error synchronizing database metrics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Run on start
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMe();
  }, [token]);

  // Synchronize everything once user profile is loaded
  useEffect(() => {
    if (user && token) {
      refreshAllStates();
    }
  }, [user]);

  // Read full detailed complaint dossier modal
  const fetchComplaintDetails = async (id: string) => {
    if (!token) return;
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const detailed = await res.json();
        setSelectedComplaintDetails(detailed);
        setSelectedComplaintId(id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSupportComplaint = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/complaints/${id}/support`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        // Reload details modal and main state
        refreshAllStates();
        fetchComplaintDetails(id);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Already supporting this complaint');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Refresh notifications locally
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('civiclens_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }

      const data = await res.json();
      localStorage.setItem('civiclens_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civiclens_token');
    setToken(null);
    setUser(null);
    setComplaints([]);
    setNotifications([]);
    setAnalytics(null);
    setSelectedComplaintId(null);
    setSelectedComplaintDetails(null);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPriorityStyle = (priority: string) => {
    const mapping: Record<string, string> = {
      low: 'bg-blue-50 text-blue-700 border-blue-100',
      medium: 'bg-yellow-50 text-slate-800 border-yellow-100',
      high: 'bg-amber-50 text-amber-700 border-amber-150',
      critical: 'bg-red-50 text-red-700 border-red-100 font-bold animate-pulse',
    };
    return `px-2.5 py-0.5 rounded text-[10px] capitalize font-semibold border ${mapping[priority] || 'bg-slate-50'}`;
  };

  const getStatusStyle = (status: string) => {
    const mapping: Record<string, string> = {
      new: 'bg-blue-50 text-blue-700 border-blue-100',
      verified: 'bg-sky-50 text-sky-700 border-sky-100',
      assigned: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      inspection: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      work_started: 'bg-amber-50 text-amber-700 border-amber-100',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return `px-2.5 py-0.5 rounded text-[10px] capitalize font-bold border ${mapping[status] || 'bg-slate-50'}`;
  };

  const getEscalationBadge = (level: number) => {
    const badges = [
      { text: 'Dept Officer', class: 'bg-slate-100 text-slate-600' },
      { text: 'Dept Head Escalation', class: 'bg-amber-50 text-amber-700 border-amber-100 border' },
      { text: 'District Officer Escalation', class: 'bg-orange-50 text-orange-700 border-orange-100 border font-semibold' },
      { text: 'Collector Dashboard Breach', class: 'bg-red-50 text-red-700 border-red-200 border font-bold animate-pulse' },
    ];
    return badges[level] || { text: 'External Escalated', class: 'bg-slate-100' };
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden selection:bg-sky-500/30 selection:text-sky-200 transition-colors duration-300 ${theme === 'light' ? 'light bg-[#f1f5f9] text-slate-800' : 'dark bg-[#040814] text-slate-100'}`}>
      {/* Immersive background glow blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse ${theme === 'light' ? 'bg-sky-400/5' : 'bg-sky-500/10'}`} style={{ animationDuration: '8s' }} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] animate-pulse ${theme === 'light' ? 'bg-indigo-400/5' : 'bg-indigo-500/15'}`} style={{ animationDuration: '12s' }} />
        <div className={`absolute top-[40%] right-[20%] w-[35%] h-[35%] rounded-full blur-[120px] ${theme === 'light' ? 'bg-teal-400/5' : 'bg-teal-500/5'}`} />
      </div>

      {/* Dynamic Header */}
      <div className="relative z-50">
        <Header
          user={user}
          notifications={notifications}
          onLogout={handleLogout}
          onRefreshData={refreshAllStates}
          unreadCount={unreadCount}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onQuickRoleSwitch={handleQuickRoleSwitch}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 relative z-10">
        {user && token ? (
          <div className="space-y-6">
            {/* Loading Indicator */}
            {loadingData && (
              <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl text-xs text-sky-300 font-semibold flex items-center justify-between shadow-sm animate-pulse">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4.5 h-4.5 animate-spin text-sky-400" />
                  Synchronizing civic databases with real-time Hybrid SLA monitors...
                </span>
                <span className="text-[10px] font-mono text-sky-400">STATUS: ONLINE</span>
              </div>
            )}

            {/* Dashboard Routing depending on user role */}
            {user.role === 'citizen' && (
              <CitizenPortal
                token={token}
                user={user}
                complaints={complaints}
                onRefreshData={refreshAllStates}
                onSelectComplaint={fetchComplaintDetails}
                onSupportComplaint={handleSupportComplaint}
              />
            )}

            {user.role === 'officer' && (
              <OfficerPanel
                token={token}
                complaints={complaints}
                onRefreshData={refreshAllStates}
                onSelectComplaint={fetchComplaintDetails}
              />
            )}

            {user.role === 'admin' && (
              <AdminPanel
                token={token}
                analytics={analytics}
                complaints={complaints}
                departments={departments}
                onRefreshData={refreshAllStates}
                onSelectComplaint={fetchComplaintDetails}
              />
            )}
          </div>
        ) : (
          // AUTHENTICATION LOGIN CARD
          <div className="max-w-md mx-auto my-12 space-y-6 relative z-10">
            <div className="text-center space-y-2">
              <div className="bg-gradient-to-tr from-sky-500/10 to-sky-600/25 border border-sky-500/30 p-4 rounded-2xl inline-flex items-center justify-center shadow-lg backdrop-blur-md">
                <Shield className="w-8 h-8 text-sky-400" />
              </div>
              <h2 className="text-2xl font-bold font-display tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Welcome to CivicLens AI</h2>
              <p className="text-xs text-slate-400 font-medium">Government Smart Governance and Autonomous Citizen Grievance Portal</p>
            </div>

            <div className="glass-card p-6 rounded-2xl shadow-xl space-y-5">
              <div className="flex border-b border-white/5 pb-2 text-xs font-semibold select-none">
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all cursor-pointer ${!isRegister ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
                >
                  Citizen / Officer Login
                </button>
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all cursor-pointer ${isRegister ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
                >
                  Register Anonymously
                </button>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs font-semibold text-red-400 text-center">
                  ⚠️ {authError}
                </div>
              )}

              {isRegister ? (
                // REGISTRATION FORM
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Enter legal full name..."
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Secure Password</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full glass-button-primary hover:scale-[1.01] transition-transform text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-lg cursor-pointer"
                  >
                    {authLoading ? 'Generating Secure Profile...' : 'Complete Registration'}
                  </button>
                </form>
              ) : (
                // LOGIN FORM
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="citizen@gmail.com, admin@civiclens.gov..."
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 block">Secret Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password..."
                      className="w-full glass-input focus:ring-1 focus:ring-sky-500/50 rounded-lg p-2 text-xs transition-all placeholder:text-slate-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full glass-button-primary hover:scale-[1.01] transition-transform text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-lg cursor-pointer"
                  >
                    {authLoading ? 'Authorizing Profile...' : 'Authorize Login'}
                  </button>
                </form>
              )}

              {/* Sandbox Quick Access Login buttons */}
              <div className="border-t border-white/5 pt-4 space-y-2 select-none">
                <span className="text-[10px] font-mono text-slate-500 block font-semibold uppercase tracking-wider">Demo Quick Access Accounts:</span>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
                  <button
                    onClick={() => handleQuickRoleSwitch('citizen')}
                    disabled={authLoading}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    👤 Citizen
                  </button>
                  <button
                    onClick={() => handleQuickRoleSwitch('officer')}
                    disabled={authLoading}
                    className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 p-2 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    👷 PWD Officer
                  </button>
                  <button
                    onClick={() => handleQuickRoleSwitch('admin')}
                    disabled={authLoading}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 p-2 rounded-lg text-center cursor-pointer transition-colors"
                  >
                    🛡️ Super Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DETAIL MODAL DETAILED DOSSIER INSPECTOR */}
      {selectedComplaintId && selectedComplaintDetails && (
        <div className="fixed inset-0 bg-[#02050f]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn relative z-50">
          <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scaleIn text-slate-100">
            {/* Modal Header */}
            <div className="bg-[#0b1329]/90 border-b border-white/10 text-white p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded text-[11px] font-bold">
                  {selectedComplaintDetails.id}
                </span>
                <h4 className="font-bold text-sm tracking-tight text-white line-clamp-1">{selectedComplaintDetails.title}</h4>
              </div>
              <button
                onClick={() => {
                  setSelectedComplaintId(null);
                  setSelectedComplaintDetails(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 flex-1">
              {/* Badges Info row */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded text-[10px] capitalize font-bold">
                  Status: {selectedComplaintDetails.status.replace('_', ' ')}
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded text-[10px] capitalize font-bold">
                  Priority: {selectedComplaintDetails.priority}
                </span>
                <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
                  {selectedComplaintDetails.category}
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  {getEscalationBadge(selectedComplaintDetails.escalationLevel).text}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Citizen description</h5>
                <p className="text-xs text-slate-200 leading-relaxed font-medium bg-white/5 p-3 rounded-lg border border-white/5">
                  {selectedComplaintDetails.description}
                </p>
              </div>

              {/* AI Analysis Card */}
              {selectedComplaintDetails.summary && (
                <div className="bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 p-4 rounded-xl shadow-3xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Bot className="w-4.5 h-4.5 text-sky-400 animate-pulse" />
                    CivicLens Hybrid AI Assist Diagnostics
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    "{selectedComplaintDetails.summary}"
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-white/5 text-[10px] text-sky-400 font-mono">
                    <div>
                      ⚡ PRIORITY SCORE: <strong className="text-white">{selectedComplaintDetails.priorityScore}/100</strong>
                    </div>
                    <div>
                      ⚠️ SEVERITY COEFFICIENT: <strong className="text-white">{selectedComplaintDetails.severity}/5</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Multimedia Evidences */}
              {(selectedComplaintDetails.photoUrl || selectedComplaintDetails.videoUrl || selectedComplaintDetails.voiceUrl) && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evidence Attachments</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedComplaintDetails.photoUrl && (
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                        <img src={selectedComplaintDetails.photoUrl} className="w-full h-32 object-cover" alt="Citizen Evidence" referrerPolicy="no-referrer" />
                        <span className="p-1.5 text-[9px] text-slate-400 block font-mono text-center uppercase">Photo Attachment</span>
                      </div>
                    )}
                    {selectedComplaintDetails.videoUrl && (
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5 p-2 flex flex-col justify-between">
                        <div className="bg-slate-950 h-24 rounded flex items-center justify-center text-slate-400 text-[11px] font-semibold">
                          [🎥 Attached Simulated Video clip]
                        </div>
                        <a href={selectedComplaintDetails.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 font-bold hover:underline block text-center mt-1">Play Video stream</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline SLA detail */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-xs flex justify-between items-center text-slate-300 font-medium">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400">RESOLUTION SLA TIMEFRAME</p>
                  <p className="font-semibold text-slate-200">
                    Deadline: {new Date(selectedComplaintDetails.slaDeadline).toLocaleString()}
                  </p>
                </div>
                {new Date(selectedComplaintDetails.slaDeadline).getTime() < Date.now() && selectedComplaintDetails.status !== 'completed' ? (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/35 px-2 py-0.5 rounded font-bold uppercase text-[9px] animate-pulse">SLA breached</span>
                ) : (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">Active SLA Safe</span>
                )}
              </div>

              {/* Officer Closing Details */}
              {selectedComplaintDetails.status === 'completed' && selectedComplaintDetails.remarks && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    Official Resolution Remarks & Closure Proof
                  </div>
                  <p className="text-xs text-slate-200 italic">
                    "{selectedComplaintDetails.remarks}"
                  </p>
                  {selectedComplaintDetails.completionPhotoUrl && (
                    <img src={selectedComplaintDetails.completionPhotoUrl} className="h-36 w-full object-cover rounded-lg border border-emerald-500/20 shadow-3xs" alt="Resolution" referrerPolicy="no-referrer" />
                  )}
                </div>
              )}

              {/* Admin-Only Secure Citizen Detail lookup */}
              {user.role === 'admin' && selectedComplaintDetails.creatorDetails && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
                    Admin Portal Secret Citizen Identity (Supporter [0])
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-indigo-200 font-medium font-mono leading-normal">
                    <p>👤 NAME: <strong className="text-white">{selectedComplaintDetails.creatorDetails.name}</strong></p>
                    <p>✉️ EMAIL: <strong className="text-white">{selectedComplaintDetails.creatorDetails.email}</strong></p>
                    <p>📞 PHONE: <strong className="text-white">{selectedComplaintDetails.creatorDetails.phone}</strong></p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0b1329]/90 px-4 py-3 border-t border-white/10 flex items-center justify-between backdrop-blur-md">
              <span className="text-[10px] text-slate-400 font-mono">SUPPORTERS COUNT: {selectedComplaintDetails.supportersCount}</span>
              <div className="flex gap-2">
                {user.role === 'citizen' && !selectedComplaintDetails.supporters.includes(user.id) && (
                  <button
                    onClick={() => handleSupportComplaint(selectedComplaintDetails.id)}
                    className="glass-button-primary text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Support (Upvote) Issue
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedComplaintId(null);
                    setSelectedComplaintDetails(null);
                  }}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
