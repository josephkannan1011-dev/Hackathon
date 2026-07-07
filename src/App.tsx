import React, { useState, useEffect } from 'react';
import {
  Shield, Bell, LogOut, User, RefreshCw, Layers, MapPin, CheckSquare,
  AlertOctagon, FileText, Bot, HelpCircle, Users, CheckCircle2, XCircle,
  Clock, ShieldCheck, ChevronRight, CornerDownRight, Sparkles, Upload, AlertTriangle,
  Smartphone, Tablet, Laptop, Wifi, WifiOff, Activity, Home, Compass
} from 'lucide-react';
import { User as UserType, Complaint, Department, Notification } from './types';
import Header from './components/Header';
import CitizenPortal from './components/CitizenPortal';
import OfficerPanel from './components/OfficerPanel';
import AdminPanel from './components/AdminPanel';
import VirtualMap from './components/VirtualMap';
import ComplaintForm from './components/ComplaintForm';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('civiclens_token'));

  // Mobile Simulator / Flutter adaptation states
  const [viewMode, setViewMode] = useState<'phone' | 'tablet' | 'responsive'>('responsive');

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent.toLowerCase();
      const isMobileUA = /iphone|android|phone/i.test(ua);
      const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua);

      if (isMobileUA && !isTabletUA) {
        setViewMode('phone');
      } else if (isTabletUA) {
        setViewMode('tablet');
      } else {
        if (width < 640) {
          setViewMode('phone');
        } else if (width >= 640 && width < 1024) {
          setViewMode('tablet');
        } else {
          setViewMode('responsive');
        }
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);
  const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'map' | 'emergency' | 'ai_assist' | 'profile'>('home');
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [activePush, setActivePush] = useState<{ id: string; title: string; message: string; type: string } | null>(null);
  const [cachedComplaints, setCachedComplaints] = useState<Complaint[]>([]);
  const [simulatedTime, setSimulatedTime] = useState<string>('12:00 PM');

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
      triggerMockPushNotification(
        '🔄 Role Simulation Changed',
        `Authenticated as virtual ${data.user.role.toUpperCase()} successfully under national security tokens.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      setAuthError('Switch simulation failed. Please refresh database.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Simulated heads-up Push Notification engine
  const triggerMockPushNotification = (title: string, message: string, type = 'info') => {
    const id = `push-${Date.now()}`;
    setActivePush({ id, title, message, type });
    if ('vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
    setTimeout(() => {
      setActivePush(prev => prev?.id === id ? null : prev);
    }, 5000);
  };

  // Sync active local clock with actual system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSimulatedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync cached database copy on data updates
  useEffect(() => {
    if (complaints.length > 0) {
      localStorage.setItem('civiclens_offline_cache', JSON.stringify(complaints));
      setCachedComplaints(complaints);
    }
  }, [complaints]);

  // Perform full fresh reload of app states
  const refreshAllStates = async () => {
    if (!token) return;
    setLoadingData(true);

    // If offline simulation mode is active, fetch from offline cache directly!
    if (networkStatus === 'offline') {
      const cached = localStorage.getItem('civiclens_offline_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setComplaints(parsed);
        setCachedComplaints(parsed);
        triggerMockPushNotification(
          '📶 Offline Local Cache Loaded',
          `Restored ${parsed.length} complaints from secure localized indexedDB storage.`,
          'warning'
        );
      }
      setLoadingData(false);
      return;
    }

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
        localStorage.setItem('civiclens_offline_cache', JSON.stringify(comps));
        setCachedComplaints(comps);
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

      triggerMockPushNotification(
        '⚡ Synchronized Civic Database',
        'SLA metrics and incident ledgers are 100% up-to-date with national servers.',
        'success'
      );
    } catch (err) {
      console.error('Error synchronizing database metrics:', err);
      // Failover to local cache automatically
      const cached = localStorage.getItem('civiclens_offline_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setComplaints(parsed);
        setCachedComplaints(parsed);
        triggerMockPushNotification(
          '⚠️ Connection Loss - Local Cache Loaded',
          `Displaying ${parsed.length} previously synchronized cases offline.`,
          'warning'
        );
      }
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
      triggerMockPushNotification(
        '🔐 Login Successful',
        `Welcome back, ${data.user.name}. Your secure JWT session has been loaded.`,
        'success'
      );
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
      triggerMockPushNotification(
        '👤 Profile Registered',
        'Your anonymous profile is generated. Authentication credentials stored in secure keychain.',
        'success'
      );
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
    triggerMockPushNotification(
      '🚪 Logout Complete',
      'Secure token wiped from local keychain. Sessions closed successfully.',
      'info'
    );
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
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden selection:bg-sky-500/30 selection:text-sky-200 transition-colors duration-300 ${theme === 'light' ? 'light bg-[#0f172a] text-slate-800' : 'dark bg-[#020617] text-slate-100'}`}>
      
      {/* Immersive background glow blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse ${theme === 'light' ? 'bg-sky-400/5' : 'bg-sky-500/10'}`} style={{ animationDuration: '8s' }} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] animate-pulse ${theme === 'light' ? 'bg-indigo-400/5' : 'bg-indigo-500/15'}`} style={{ animationDuration: '12s' }} />
      </div>

      {/* Simulator Control Deck HUD (Sticky Top Header) */}
      <header className="relative z-50 w-full bg-slate-950/85 backdrop-blur-md border-b border-white/10 px-4 py-3 select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & National Tag */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-500/20 to-indigo-600/30 border border-sky-500/30 p-2 rounded-xl flex items-center justify-center shadow-md animate-pulse">
              <Shield className="w-5.5 h-5.5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-display">CivicLens AI</h1>
                <span className="bg-sky-500/25 text-sky-400 border border-sky-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Android Client</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Official Flutter Framework Engine Mockup
              </p>
            </div>
          </div>

          {/* Simulator Actions Section */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Simulated Settings */}
            <div className="flex items-center gap-2">
              {/* Network Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextStatus = networkStatus === 'online' ? 'offline' : 'online';
                  setNetworkStatus(nextStatus);
                  if (nextStatus === 'offline') {
                    triggerMockPushNotification(
                      '📶 Simulated Network Disconnection',
                      'SQLite Database Offline Cache activated. Viewing preloaded incidents offline.',
                      'warning'
                    );
                  } else {
                    triggerMockPushNotification(
                      '📶 Connected to National Cloud',
                      'Establishing JWT Secure handshakes... Auto-synchronizing databases.',
                      'success'
                    );
                    refreshAllStates();
                  }
                }}
                className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-tight ${networkStatus === 'online' ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/35 text-emerald-400' : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-400 animate-pulse'}`}
                title="Toggle Local Cache Mode vs Live Cloud REST API Sync"
              >
                {networkStatus === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{networkStatus === 'online' ? 'WiFi Connected' : 'Offline Mode'}</span>
              </button>

              {/* Force Alert Simulation Button */}
              <button
                type="button"
                onClick={() => {
                  const alerts = [
                    { title: '🚨 Emergency Dispatch Activated', text: 'SLA Rapid Response team deployed. GPS tracking locks enabled.', type: 'error' },
                    { title: '📝 Priority Escalated to Collector', text: 'Collector SLA Breach timers running. PWD assigned priority.', type: 'warning' },
                    { title: '👷 Resolution Closure Uploaded', text: 'Officer remarks logged for grievance PWD-103. Verified.', type: 'success' },
                    { title: '🔔 New Neighbor Support Added', text: 'Grievance gained 4 new anonymous citizen endorsements.', type: 'info' }
                  ];
                  const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
                  triggerMockPushNotification(randomAlert.title, randomAlert.text, randomAlert.type);
                }}
                className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold tracking-tight cursor-pointer"
                title="Send Simulated Android Broadcast Notification"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Mock Broadcast Alert</span>
              </button>

              {/* Theme toggler */}
              <button
                type="button"
                onClick={handleToggleTheme}
                className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl flex items-center justify-center cursor-pointer"
                title="Toggle Simulator Background Aesthetics"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {/* Authenticated User Profile Section */}
              {user && (
                <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs font-bold text-white block leading-none">{user.name}</span>
                      <span className={`text-[8.5px] px-1.5 py-0.5 rounded border font-mono font-bold uppercase ${
                        user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                        user.role === 'officer' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 block mt-0.5 leading-none">{user.id}</span>
                  </div>
                  
                  {/* Circular Avatar initials */}
                  <div className="w-8 h-8 bg-gradient-to-tr from-sky-500 to-indigo-600 border border-sky-400/30 rounded-full text-xs font-bold flex items-center justify-center text-white uppercase shadow-sm">
                    {user.name ? user.name.substring(0, 2) : 'CL'}
                  </div>

                  {/* Logout button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 text-slate-300 hover:border-red-500/30 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Sandbox Preview Arena Container */}
      <main className={`flex-1 relative z-10 w-full flex flex-col items-center justify-center p-4 sm:p-6 select-none ${viewMode !== 'responsive' ? 'bg-[#0b0f19] bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:16px_16px]' : ''}`}>
        
        {/* VIEWMODE 1 & 2: PORTRAIT ANDROID PHONE OR TABLET CHASSIS FRAMES */}
        {viewMode !== 'responsive' ? (
          <div className="relative transition-all duration-500">
            
            {/* PHYSICAL HARDWARE CHASSIS CONTAINER BEZELS */}
            <div className={`bg-slate-950 border-[12px] border-slate-900 rounded-[52px] shadow-2xl relative overflow-hidden transition-all duration-500 ${viewMode === 'phone' ? 'w-[393px] h-[852px]' : 'w-[1024px] h-[768px]'}`}>
              
              {/* TOP SPEAKER AND CAMERA NOTCH HOLE */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-[1000] flex items-center justify-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#050c18] border border-slate-800 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-[#0a1e3a] rounded-full"></div>
                <div className="w-12 h-1 bg-white/10 rounded-full"></div>
              </div>

              {/* MOBILE heads-up PUSH NOTIFICATIONS SLIDING BANNER */}
              <div className={`absolute left-4 right-4 z-[9999] bg-[#0c142c]/95 border border-sky-500/25 p-3.5 rounded-2xl shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all duration-500 transform ${activePush ? 'top-[48px] opacity-100 scale-100' : '-top-40 opacity-0 scale-95 pointer-events-none'}`}>
                <div className={`p-2 rounded-xl text-slate-950 ${activePush?.type === 'success' ? 'bg-emerald-400' : activePush?.type === 'warning' ? 'bg-amber-400' : activePush?.type === 'error' ? 'bg-rose-400' : 'bg-sky-400'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    🏛️ GOVT DISPATCH SYSTEM
                  </span>
                  <p className="text-xs font-bold text-white leading-tight mt-0.5">{activePush?.title}</p>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">{activePush?.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePush(null)}
                  className="text-slate-500 hover:text-white font-bold text-xs bg-white/5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* SIMULATED SYSTEM STATUS BAR */}
              <div className="h-[44px] px-6 pt-2 flex items-center justify-between text-white text-[11px] font-semibold tracking-wide z-50 select-none bg-slate-950/80 border-b border-white/5 relative">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px]">{simulatedTime}</span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1 rounded font-bold font-mono">IND</span>
                </div>
                
                {/* Empty center gap for the camera notch */}
                <div className="w-32"></div>

                <div className="flex items-center gap-2 font-mono">
                  {networkStatus === 'online' ? (
                    <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" /> 5G
                    </span>
                  ) : (
                    <span className="text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                      <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> Offline
                    </span>
                  )}
                  <span className="text-[10px] text-slate-300">SLA-98%</span>
                  <div className="w-5.5 h-3 border border-white/30 rounded px-0.5 py-0.25 flex items-center gap-0.5 bg-white/5">
                    <div className="h-full w-[85%] bg-emerald-400 rounded-xs"></div>
                  </div>
                </div>
              </div>

              {/* NATIVE MOBILE CONTENT CONTAINER STAGE */}
              <div className="absolute inset-0 top-[44px] bottom-[20px] overflow-hidden flex flex-col bg-[#040814] select-text">
                
                {/* CASE A: USER NOT LOGGED IN - MOBILE AUTH LAYER */}
                {!token || !user ? (
                  <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto scrollbar-none relative">
                    
                    {/* Splash watermarks */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                      <Shield className="w-64 h-64 text-sky-500" />
                    </div>

                    {/* Logo heading */}
                    <div className="text-center space-y-2 pt-6 relative z-10">
                      <div className="bg-gradient-to-tr from-sky-500/10 to-indigo-600/25 border border-sky-500/30 p-3.5 rounded-2xl inline-flex items-center justify-center shadow-lg backdrop-blur-md">
                        <Shield className="w-7 h-7 text-sky-400" />
                      </div>
                      <h2 className="text-xl font-bold font-display tracking-tight text-white">CivicLens AI</h2>
                      <p className="text-[10px] text-slate-400 max-w-[260px] mx-auto font-medium">Government Smart Governance and Autonomous Citizen Grievance Portal</p>
                    </div>

                    {/* Authentication panel box */}
                    <div className="bg-slate-900/60 border border-white/5 p-4.5 rounded-2xl shadow-xl space-y-4 relative z-10 backdrop-blur-sm">
                      <div className="flex border-b border-white/5 pb-2 text-[11px] font-bold select-none">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegister(false);
                            setAuthError(null);
                          }}
                          className={`flex-1 pb-1.5 border-b-2 text-center transition-all cursor-pointer ${!isRegister ? 'border-sky-500 text-sky-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
                        >
                          Citizen / Officer Login
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegister(true);
                            setAuthError(null);
                          }}
                          className={`flex-1 pb-1.5 border-b-2 text-center transition-all cursor-pointer ${isRegister ? 'border-sky-500 text-sky-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
                        >
                          Register
                        </button>
                      </div>

                      {authError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-[10px] font-semibold text-red-400 text-center">
                          ⚠️ {authError}
                        </div>
                      )}

                      {isRegister ? (
                        // Register Fields
                        <form onSubmit={handleRegister} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Full Name</label>
                            <input
                              type="text"
                              required
                              value={regName}
                              onChange={(e) => setRegName(e.target.value)}
                              placeholder="Name..."
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Email</label>
                            <input
                              type="email"
                              required
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="citizen@example.com"
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Phone</label>
                            <input
                              type="tel"
                              required
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              placeholder="+91..."
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Password</label>
                            <input
                              type="password"
                              required
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Password..."
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs shadow-lg cursor-pointer mt-1"
                          >
                            {authLoading ? 'Generating Account...' : 'Complete Registration'}
                          </button>
                        </form>
                      ) : (
                        // Login Fields
                        <form onSubmit={handleLogin} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Registered Email</label>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="citizen@gmail.com, admin@civiclens.gov..."
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300 block">Password</label>
                            <input
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter account password..."
                              className="w-full bg-white/5 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 font-medium outline-none focus:border-sky-500/50"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs shadow-lg cursor-pointer mt-1"
                          >
                            {authLoading ? 'Authorizing Profile...' : 'Authorize Login'}
                          </button>
                        </form>
                      )}



                    </div>

                    <div className="text-center pt-2">
                      <span className="text-[9px] text-slate-600 font-mono font-semibold tracking-wide">SECURED UNDER CENTRAL G2C ENCRYPTED PROTOCOLS</span>
                    </div>

                  </div>
                ) : (
                  
                  // CASE B: USER LOGGED IN - NATIVE MOBILE NAVIGATION VIEWPORT
                  <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
                    
                    {/* APPBAR TOP COMPACT BANNER (NATIVE APP HEADER) */}
                    <header className="h-[48px] px-3 bg-slate-900 border-b border-white/5 flex items-center justify-between text-white select-none z-10 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-sky-500 rounded-sm"></span>
                        <div>
                          <p className="text-xs font-bold font-display tracking-tight text-white leading-tight">CivicLens App</p>
                          <p className="text-[8.5px] font-bold font-mono text-slate-400 tracking-wide uppercase">
                            {user.role === 'admin' ? '🛡️ Central Command' : user.role === 'officer' ? '👷 Dept Console' : '👤 Citizen Desk'}
                          </p>
                        </div>
                      </div>

                      {/* Header Compact Controls */}
                      <div className="flex items-center gap-2.5">
                        
                        {/* Compact Sync Indicator */}
                        {loadingData && (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        )}

                        {/* Notifications alert count */}
                        <div className="relative">
                          <Bell
                            className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer"
                            onClick={() => {
                              setActiveMobileTab('profile');
                              triggerMockPushNotification('🔔 Notifications Logs Opened', 'Displaying all automated department assignment alerts.', 'info');
                            }}
                          />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        {/* Circular Avatar initials */}
                        <div
                          onClick={() => setActiveMobileTab('profile')}
                          className="w-6.5 h-6.5 bg-gradient-to-tr from-sky-500 to-indigo-600 border border-sky-400/30 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer text-white uppercase shadow-sm"
                        >
                          {user.name ? user.name.substring(0, 2) : 'CL'}
                        </div>
                      </div>
                    </header>

                    {/* DYNAMIC SCROLLABLE BODY PANELS DEPENDING ON ACTIVE BOTTOM TAB AND ROLE */}
                    <div className="flex-1 overflow-y-auto scrollbar-none relative flex flex-col bg-[#040814]">
                      
                      {/* CITIZEN VIEWS */}
                      {user.role === 'citizen' && (
                        <div className="flex-1 flex flex-col">
                          
                          {/* TAB 1: Citizen Grievances / Feed */}
                          {activeMobileTab === 'home' && (
                            <div className="p-4 space-y-4 animate-fadeIn">
                              
                              {/* Hero Card Stat */}
                              <div className="bg-gradient-to-r from-[#0c1630] to-[#050b1a] border border-white/5 rounded-2xl p-4 shadow-xl text-left space-y-1.5 relative overflow-hidden">
                                <div className="absolute right-[-10px] top-[-10px] opacity-10">
                                  <Shield className="w-24 h-24 text-sky-500" />
                                </div>
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 inline-block">Active SLAs Running</span>
                                <h3 className="text-sm font-extrabold text-white">Central Grievance Dashboard</h3>
                                <p className="text-[11px] text-slate-400 leading-normal">
                                  Report issues, track real-time resolution timelines, and secure SLA commitments from local bodies.
                                </p>
                                <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-semibold text-slate-300">
                                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                    📋 Cases Logged: <strong className="text-white font-bold">{complaints.length}</strong>
                                  </div>
                                  <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                    ✅ SLA Met: <strong className="text-emerald-400 font-bold">100%</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Search & Filter Chip */}
                              <div className="space-y-2 select-none">
                                <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                                  <Activity className="w-4 h-4 text-sky-400" />
                                  Recent Neighborhood Incidents
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium">Auto-classified and routed under G2C telemetry.</p>
                              </div>

                              {/* Compact Feed */}
                              <div className="space-y-3 text-left">
                                {complaints.length === 0 ? (
                                  <div className="text-center p-8 text-slate-500 text-xs font-semibold">
                                    No active complaints logged yet.
                                  </div>
                                ) : (
                                  complaints.map(c => (
                                    <div
                                      key={c.id}
                                      onClick={() => fetchComplaintDetails(c.id)}
                                      className="p-3.5 bg-slate-900/60 border border-white/5 hover:border-white/10 rounded-2xl shadow-sm cursor-pointer transition-all hover:translate-y-[-1px] space-y-2.5 active:scale-[0.99]"
                                    >
                                      <div className="flex items-start justify-between gap-2.5">
                                        <div className="space-y-0.5 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono bg-white/10 text-sky-400 border border-white/5 px-2 py-0.5 rounded text-[8px] font-bold">
                                              {c.id}
                                            </span>
                                            <span className="text-[9px] text-slate-500 font-bold">{c.category}</span>
                                          </div>
                                          <h4 className="text-xs font-bold text-white tracking-tight line-clamp-1">{c.title}</h4>
                                        </div>
                                        <span className={getStatusStyle(c.status)}>
                                          {c.status.replace('_', ' ')}
                                        </span>
                                      </div>

                                      <p className="text-[10.5px] text-slate-300 line-clamp-2 leading-relaxed">{c.description}</p>
                                      
                                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold border-t border-white/5 pt-2 flex-wrap gap-2">
                                        <span className="truncate max-w-[180px]">📍 {c.address}</span>
                                        <span className={getPriorityStyle(c.priority)}>{c.priority} Priority</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>

                            </div>
                          )}

                          {/* TAB 2: Citizen India GIS Map */}
                          {activeMobileTab === 'map' && (
                            <div className="flex-1 w-full h-full relative flex flex-col" style={{ minHeight: '600px' }}>
                              <VirtualMap
                                complaints={complaints}
                                selectedComplaintId={selectedComplaintId}
                                height="100%"
                                interactive={true}
                                onPickLocation={(coords, addr, stateName, districtName) => {
                                  // Prompt simulation push
                                  triggerMockPushNotification(
                                    '📍 GPS Coordinates Picked',
                                    `Target: ${addr}. Reverse-geocoded to ${stateName || 'Delhi'}.`,
                                    'info'
                                  );
                                  // Open bottom sheet
                                  setIsReportSheetOpen(true);
                                  // Set defaults in localStorage or cache for auto-population
                                  localStorage.setItem('civiclens_temp_coords', JSON.stringify({ coords, addr, stateName, districtName }));
                                }}
                                onSelectComplaint={(id) => fetchComplaintDetails(id)}
                              />
                            </div>
                          )}

                          {/* TAB 3: Citizen Emergency Dispatcher */}
                          {activeMobileTab === 'emergency' && (
                            <div className="p-4 space-y-4 text-left animate-fadeIn">
                              
                              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl shadow-xl space-y-2">
                                <span className="bg-rose-500/25 text-rose-400 border border-rose-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider inline-block">SLA Emergency Mode</span>
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                                  <AlertTriangle className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                                  Instant Emergency Dispatch
                                </h3>
                                <p className="text-[11px] text-slate-300 leading-normal">
                                  Dispatches national emergency response units directly to your target GPS location. Automatically logs an index on police, medical, or fire telemetry.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 gap-3 pt-2">
                                
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setLoadingData(true);
                                    try {
                                      const res = await fetch('/api/complaints', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                          title: 'CRITICAL DISPATCH: Water Main Burst Flooding',
                                          description: 'Rapid water burst flooding streets, damaging roads, and risking electrical shortcuts.',
                                          category: 'Water Supply & Leakage',
                                          gps: { lat: 28.6139, lng: 77.2090 },
                                          address: 'Central District Gate, New Delhi',
                                          state: 'Delhi',
                                          district: 'New Delhi',
                                          isEmergency: true
                                        })
                                      });
                                      if (res.ok) {
                                        triggerMockPushNotification(
                                          '🚨 Emergency SLA Dispatched',
                                          'Critical Incident water pipeline logged. Units deployed to Central District.',
                                          'error'
                                        );
                                        refreshAllStates();
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setLoadingData(false);
                                    }
                                  }}
                                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
                                >
                                  <AlertOctagon className="w-4.5 h-4.5 animate-bounce" />
                                  Dispatch Water / Flooding Response
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    setLoadingData(true);
                                    try {
                                      const res = await fetch('/api/complaints', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({
                                          title: 'CRITICAL DISPATCH: High Tension Wire Fall',
                                          description: 'High voltage electrical cable snapped, sparks throwing, major hazard.',
                                          category: 'Street Light & Electricals',
                                          gps: { lat: 28.6139, lng: 77.2090 },
                                          address: 'Connaught Circle Link, New Delhi',
                                          state: 'Delhi',
                                          district: 'New Delhi',
                                          isEmergency: true
                                        })
                                      });
                                      if (res.ok) {
                                        triggerMockPushNotification(
                                          '🚨 Emergency SLA Dispatched',
                                          'Power Grid hazard logged. Dispatched linesmen crews to Connaught Circle.',
                                          'error'
                                        );
                                        refreshAllStates();
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setLoadingData(false);
                                    }
                                  }}
                                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
                                >
                                  <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />
                                  Dispatch Power Grid Crew
                                </button>

                              </div>

                            </div>
                          )}

                          {/* TAB 4: Citizen AI Assistant ChatBot */}
                          {activeMobileTab === 'ai_assist' && (
                            <div className="flex-1 flex flex-col p-4 animate-fadeIn">
                              <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-2xl text-left space-y-1.5 mb-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                                  <Bot className="w-4.5 h-4.5 animate-pulse" />
                                  CivicLens AI Diagnostic Engine
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                  Describe issues in plain text. AI classifies, scores severity, and helps prefill complaint records.
                                </p>
                              </div>
                              <div className="flex-1 flex flex-col">
                                <CitizenPortal
                                  token={token}
                                  user={user}
                                  complaints={complaints}
                                  onRefreshData={refreshAllStates}
                                  onSelectComplaint={fetchComplaintDetails}
                                  onSupportComplaint={handleSupportComplaint}
                                  overrideActiveTab="chatbot"
                                />
                              </div>
                            </div>
                          )}

                          {/* TAB 5: Citizen Profile & Security */}
                          {activeMobileTab === 'profile' && (
                            <div className="p-4 space-y-4 text-left animate-fadeIn">
                              
                              {/* Avatar Profile Card */}
                              <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl shadow-xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-slate-950 font-bold text-lg font-display uppercase">
                                  {user.name ? user.name.substring(0, 2) : 'CL'}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-sm font-bold text-white tracking-tight">{user.name}</h4>
                                  <p className="text-[10.5px] text-slate-400 font-semibold">{user.email}</p>
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase inline-block">
                                    Verified Citizen Account
                                  </span>
                                </div>
                              </div>

                              {/* Secure Settings card */}
                              <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl shadow-lg space-y-3">
                                <h5 className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Secure Storage & Telemetry</h5>
                                
                                <div className="space-y-2 text-xs font-medium text-slate-300">
                                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                                    <span>Auth Token: JWT RSA-256</span>
                                    <span className="text-[10px] font-mono text-sky-400">ACTIVE</span>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                                    <span>Persistence: flutter_secure_storage</span>
                                    <span className="text-[10px] font-mono text-emerald-400">ENCRYPTED</span>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                                    <span>Offline SQLite Cache: Enabled</span>
                                    <span className="text-[10px] font-mono text-emerald-400">SYNCED</span>
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5">
                                    <span>Biometrics (Mock FaceID)</span>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                      <input type="checkbox" defaultChecked className="sr-only peer" />
                                      <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500"></div>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Notification Logs */}
                              <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Automated Notification Logs</h5>
                                  <button
                                    onClick={handleMarkNotificationsRead}
                                    className="text-[9.5px] text-sky-400 font-bold hover:underline cursor-pointer"
                                  >
                                    Mark All Read
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {notifications.length === 0 ? (
                                    <p className="text-[10.5px] text-slate-500 italic">No push notifications broadcasted.</p>
                                  ) : (
                                    notifications.map(n => (
                                      <div key={n.id} className={`p-2 rounded-xl text-xs border ${n.isRead ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-300'}`}>
                                        <p className="font-bold">{n.title}</p>
                                        <p className="text-[10px] text-slate-300 mt-0.5">{n.message}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>



                              {/* Logout button */}
                              <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-extrabold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <LogOut className="w-4 h-4" /> Terminate Secure Profile Session
                              </button>

                            </div>
                          )}

                        </div>
                      )}

                      {/* OFFICER VIEWS */}
                      {user.role === 'officer' && (
                        <div className="flex-1 flex flex-col">
                          {activeMobileTab === 'home' && (
                            <div className="p-4 space-y-4 animate-fadeIn">
                              <div className="bg-[#0c1630] border border-white/5 rounded-2xl p-4 shadow-md text-left space-y-1">
                                <span className="bg-sky-500/25 text-sky-400 border border-sky-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider inline-block">Official SLA Command</span>
                                <h3 className="text-sm font-extrabold text-white">Department Assigned Incidents</h3>
                                <p className="text-[11.5px] text-slate-400 leading-normal">
                                  You are authorized to verify, assign, update, and upload resolution proof for complaints.
                                </p>
                              </div>
                              <div className="flex-1">
                                <OfficerPanel
                                  token={token}
                                  complaints={complaints}
                                  onRefreshData={refreshAllStates}
                                  onSelectComplaint={fetchComplaintDetails}
                                />
                              </div>
                            </div>
                          )}

                          {activeMobileTab === 'map' && (
                            <div className="flex-1 w-full h-full relative flex flex-col" style={{ minHeight: '600px' }}>
                              <VirtualMap
                                complaints={complaints}
                                selectedComplaintId={selectedComplaintId}
                                height="100%"
                                interactive={false}
                                onSelectComplaint={(id) => fetchComplaintDetails(id)}
                              />
                            </div>
                          )}

                          {activeMobileTab === 'profile' && (
                            <div className="p-4 space-y-4 text-left animate-fadeIn">
                              <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl shadow-xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-slate-950 font-bold text-lg font-display uppercase">
                                  {user.name ? user.name.substring(0, 2) : 'OF'}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-sm font-bold text-white tracking-tight">{user.name}</h4>
                                  <p className="text-[10.5px] text-slate-400 font-semibold">{user.email}</p>
                                  <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase inline-block">
                                    Authorized Officer
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickRoleSwitch('citizen')}
                                className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                Switch back to Citizen Simulator
                              </button>

                              <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-extrabold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer animate-fadeIn"
                              >
                                <LogOut className="w-4 h-4" /> Sign Out
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ADMIN VIEWS */}
                      {user.role === 'admin' && (
                        <div className="flex-1 flex flex-col">
                          
                          {activeMobileTab === 'home' && (
                            <div className="p-4 space-y-4 animate-fadeIn">
                              <div className="bg-[#0c1630] border border-white/5 rounded-2xl p-4 shadow-md text-left space-y-1">
                                <span className="bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider inline-block">SLA Master Admin Control</span>
                                <h3 className="text-sm font-extrabold text-white">National Incident Dispatch Console</h3>
                                <p className="text-[11.5px] text-slate-400 leading-normal">
                                  You are authorized to oversee cross-departmental SLA breaches, dispatch teams, and inspect citizen detail dossiers.
                                </p>
                              </div>
                              <div className="flex-1">
                                <AdminPanel
                                  token={token}
                                  analytics={analytics}
                                  complaints={complaints}
                                  departments={departments}
                                  onRefreshData={refreshAllStates}
                                  onSelectComplaint={fetchComplaintDetails}
                                  overrideActiveTab="assignments"
                                />
                              </div>
                            </div>
                          )}

                          {activeMobileTab === 'map' && (
                            <div className="flex-1 w-full h-full relative flex flex-col" style={{ minHeight: '600px' }}>
                              <VirtualMap
                                complaints={complaints}
                                selectedComplaintId={selectedComplaintId}
                                height="100%"
                                interactive={false}
                                onSelectComplaint={(id) => fetchComplaintDetails(id)}
                              />
                            </div>
                          )}

                          {activeMobileTab === 'emergency' && ( // Acts as master analytics
                            <div className="p-4 space-y-4 animate-fadeIn">
                              <div className="bg-[#0c1630] border border-white/5 rounded-2xl p-4 shadow-md text-left space-y-1 mb-2">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                                  <Activity className="w-4.5 h-4.5 text-indigo-400" />
                                  Live Analytical Telemetry
                                </h3>
                              </div>
                              <div className="flex-1">
                                <AdminPanel
                                  token={token}
                                  analytics={analytics}
                                  complaints={complaints}
                                  departments={departments}
                                  onRefreshData={refreshAllStates}
                                  onSelectComplaint={fetchComplaintDetails}
                                  overrideActiveTab="overview"
                                />
                              </div>
                            </div>
                          )}

                          {activeMobileTab === 'profile' && (
                            <div className="p-4 space-y-4 text-left animate-fadeIn">
                              <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl shadow-xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg font-display uppercase">
                                  {user.name ? user.name.substring(0, 2) : 'AD'}
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-sm font-bold text-white tracking-tight">{user.name}</h4>
                                  <p className="text-[10.5px] text-slate-400 font-semibold">{user.email}</p>
                                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase inline-block">
                                    System Super Admin
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickRoleSwitch('citizen')}
                                className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                Switch back to Citizen Simulator
                              </button>

                              <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-extrabold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <LogOut className="w-4 h-4" /> Sign Out
                              </button>
                            </div>
                          )}

                        </div>
                      )}

                    </div>

                    {/* CITIZEN PORTAL FAB FOR FILING NEW INCIDENTS */}
                    {user.role === 'citizen' && (activeMobileTab === 'home' || activeMobileTab === 'map') && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReportSheetOpen(true);
                          triggerMockPushNotification('📝 Grievance Assistant Mounted', 'Slide up Bottom Sheet loaded. Enter grievance details or capture evidence.', 'info');
                        }}
                        className="absolute bottom-4 right-4 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:scale-[1.05] active:scale-[0.98] text-white font-extrabold p-3.5 rounded-full shadow-2xl transition-transform cursor-pointer z-40 border border-sky-400/20 animate-fadeIn"
                        title="File New Citizen Grievance"
                      >
                        <Upload className="w-5.5 h-5.5 text-white" />
                      </button>
                    )}

                    {/* NATIVE BOTTOM NAVIGATION BAR (ADAPTS DEPENDING ON USER ROLE) */}
                    <nav className="h-[56px] bg-slate-900 border-t border-white/5 grid grid-cols-5 items-center justify-center text-center select-none z-40 shrink-0">
                      
                      {/* Tab 1: Feed Home */}
                      <button
                        type="button"
                        onClick={() => setActiveMobileTab('home')}
                        className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'home' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                      >
                        <Home className="w-4.5 h-4.5" />
                        <span className="text-[9px] font-sans">Grievances</span>
                      </button>

                      {/* Tab 2: Maps GIS */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMobileTab('map');
                          triggerMockPushNotification('🗺️ OSMap GIS Initialized', 'Leaflet interactive canvas mapped across the entire territory of India.', 'info');
                        }}
                        className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'map' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                      >
                        <Compass className="w-4.5 h-4.5" />
                        <span className="text-[9px] font-sans">GIS Map</span>
                      </button>

                      {/* Tab 3: Dispatcher for Citizen / Analytics for Admin / Spacer for Officer */}
                      {user.role === 'citizen' ? (
                        <button
                          type="button"
                          onClick={() => setActiveMobileTab('emergency')}
                          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'emergency' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          <AlertTriangle className="w-4.5 h-4.5" />
                          <span className="text-[9px] font-sans">Emergency</span>
                        </button>
                      ) : user.role === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => setActiveMobileTab('emergency')}
                          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'emergency' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          <Activity className="w-4.5 h-4.5" />
                          <span className="text-[9px] font-sans">Analytics</span>
                        </button>
                      ) : (
                        <div className="text-slate-800 text-[8px] font-bold font-mono uppercase">
                          SLA CONF
                        </div>
                      )}

                      {/* Tab 4: AI Assist (Citizen only) */}
                      {user.role === 'citizen' ? (
                        <button
                          type="button"
                          onClick={() => setActiveMobileTab('ai_assist')}
                          className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'ai_assist' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                        >
                          <Bot className="w-4.5 h-4.5" />
                          <span className="text-[9px] font-sans">AI Diagnost</span>
                        </button>
                      ) : (
                        <div className="text-slate-800 text-[8px] font-bold font-mono uppercase">
                          G2C SEC
                        </div>
                      )}

                      {/* Tab 5: Profile/Settings */}
                      <button
                        type="button"
                        onClick={() => setActiveMobileTab('profile')}
                        className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeMobileTab === 'profile' ? 'text-sky-400 font-bold' : 'text-slate-500 hover:text-slate-400'}`}
                      >
                        <User className="w-4.5 h-4.5" />
                        <span className="text-[9px] font-sans">Settings</span>
                      </button>

                    </nav>

                  </div>
                )}

                {/* BOTTOM SHEET SLIDE-UP DRAWER FOR GRIEVANCE REPORTING FORM */}
                {user && user.role === 'citizen' && (
                  <div className={`absolute left-0 right-0 bottom-0 bg-[#0c142c] border-t border-white/10 rounded-t-[32px] shadow-2xl z-[100] transition-all duration-500 ease-in-out overflow-hidden flex flex-col select-text ${isReportSheetOpen ? 'h-[92%]' : 'h-0 pointer-events-none'}`}>
                    
                    {/* Drawer drag Handle */}
                    <div
                      onClick={() => setIsReportSheetOpen(false)}
                      className="py-3 bg-slate-900 border-b border-white/5 flex items-center justify-between px-5 select-none shrink-0"
                    >
                      <div className="w-12 h-1 bg-slate-700 rounded-full cursor-pointer hover:bg-slate-500 transition-colors"></div>
                      <span className="text-[10.5px] font-bold text-slate-300 font-display">New Citizen Grievance Filing</span>
                      <button
                        type="button"
                        onClick={() => setIsReportSheetOpen(false)}
                        className="text-[10px] font-mono text-rose-400 hover:text-rose-300 font-extrabold cursor-pointer"
                      >
                        DISMISS [✕]
                      </button>
                    </div>

                    {/* Scrollable Form Inside Bottom Sheet drawer */}
                    <div className="flex-1 overflow-y-auto p-4 select-text">
                      <ComplaintForm
                        token={token}
                        onSuccess={(c) => {
                          setIsReportSheetOpen(false);
                          refreshAllStates();
                          triggerMockPushNotification(
                            '📝 Grievance Logged: ' + c.title.substring(0, 24) + '...',
                            `SLA Target Active. Priority score: ${c.priorityScore}/100. Routed.`,
                            'success'
                          );
                        }}
                        onSupportDuplicate={(id) => {
                          handleSupportComplaint(id);
                          setIsReportSheetOpen(false);
                        }}
                        complaints={complaints}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* SIMULATED PHYSICAL HOME BUTTON BAR FOR ANDROID GESTURE */}
              <div className="absolute bottom-0 left-0 right-0 h-[20px] bg-slate-950 flex items-center justify-center z-50 select-none">
                <div className="w-28 h-1 bg-white/30 rounded-full"></div>
              </div>

            </div>

          </div>
        ) : (
          
          // VIEWMODE 3: STANDARD WEB FULL-SCREEN PRESENTATION LAYOUT FALLBACK
          <div className="w-full max-w-7xl mx-auto space-y-6 relative z-10 select-text animate-fadeIn text-left">
            
            {/* Sync bar */}
            {loadingData && (
              <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl text-xs text-sky-300 font-semibold flex items-center justify-between shadow-sm animate-pulse">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4.5 h-4.5 animate-spin text-sky-400" />
                  Synchronizing civic databases with real-time Hybrid SLA monitors...
                </span>
                <span className="text-[10px] font-mono text-sky-400">STATUS: ONLINE</span>
              </div>
            )}

            {/* Auth screen */}
            {!token || !user ? (
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
                      type="button"
                      onClick={() => {
                        setIsRegister(false);
                        setAuthError(null);
                      }}
                      className={`flex-1 pb-2 border-b-2 text-center transition-all cursor-pointer ${!isRegister ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
                    >
                      Citizen / Officer Login
                    </button>
                    <button
                      type="button"
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



                </div>
              </div>
            ) : (
              // Dashboard Content Routing fallback
              <div className="space-y-6">
                <Header
                  user={user}
                  notifications={notifications}
                  onLogout={handleLogout}
                  onRefreshData={refreshAllStates}
                  unreadCount={unreadCount}
                  onMarkNotificationsRead={handleMarkNotificationsRead}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                />
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
            )}

          </div>
        )}

      </main>

      {/* DETAILED DOSSIER DIALOG DIALOG OVERLAY INSPECTOR */}
      {selectedComplaintId && selectedComplaintDetails && (
        <div className="fixed inset-0 bg-[#02050f]/85 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fadeIn relative z-[99999]">
          <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-scaleIn text-slate-100">
            
            {/* Modal Header */}
            <div className="bg-[#0b1329]/95 border-b border-white/10 text-white p-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded text-[11px] font-bold">
                  {selectedComplaintDetails.id}
                </span>
                <h4 className="font-bold text-sm tracking-tight text-white line-clamp-1">{selectedComplaintDetails.title}</h4>
              </div>
              <button
                type="button"
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
            <div className="p-5 space-y-5 flex-1 text-left select-text">
              
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

              {/* Citizen Description */}
              <div className="space-y-1">
                <h5 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Citizen description</h5>
                <p className="text-xs text-slate-200 leading-relaxed font-medium bg-white/5 p-3 rounded-lg border border-white/5">
                  {selectedComplaintDetails.description}
                </p>
              </div>

              {/* AI Diagnostics Analysis */}
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

              {/* Evidences */}
              {(selectedComplaintDetails.photoUrl || selectedComplaintDetails.videoUrl || selectedComplaintDetails.voiceUrl) && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Evidence Attachments</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedComplaintDetails.photoUrl && (
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                        <img src={selectedComplaintDetails.photoUrl} className="w-full h-32 object-cover" alt="Evidence" referrerPolicy="no-referrer" />
                        <span className="p-1.5 text-[9px] text-slate-400 block font-mono text-center uppercase">Photo Attachment</span>
                      </div>
                    )}
                    {selectedComplaintDetails.videoUrl && (
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5 p-2 flex flex-col justify-between">
                        <div className="bg-slate-950 h-24 rounded flex items-center justify-center text-slate-400 text-[11px] font-semibold">
                          [🎥 Attached Video Evidence]
                        </div>
                        <a href={selectedComplaintDetails.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 font-bold hover:underline block text-center mt-1">Play Video stream</a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SLA timeframe */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-xs flex justify-between items-center text-slate-300 font-medium">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-mono text-slate-400">RESOLUTION SLA TIMEFRAME</p>
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

              {/* Resolution proofs */}
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

              {/* Super Admin Secret lookup */}
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
            <div className="bg-[#0b1329]/95 px-4 py-3 border-t border-white/10 flex items-center justify-between backdrop-blur-md shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">SUPPORTERS COUNT: {selectedComplaintDetails.supportersCount}</span>
              <div className="flex gap-2">
                {user.role === 'citizen' && !selectedComplaintDetails.supporters.includes(user.id) && (
                  <button
                    type="button"
                    onClick={() => handleSupportComplaint(selectedComplaintDetails.id)}
                    className="glass-button-primary text-white font-bold text-xs py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Support (Upvote) Issue
                  </button>
                )}
                <button
                  type="button"
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
