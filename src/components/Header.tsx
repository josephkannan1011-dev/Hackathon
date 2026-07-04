import React, { useState } from 'react';
import { Shield, Bell, LogOut, User, Menu, RefreshCw, Layers, Sun, Moon } from 'lucide-react';
import { User as UserType, Notification } from '../types';

interface HeaderProps {
  user: UserType | null;
  notifications: Notification[];
  onLogout: () => void;
  onRefreshData?: () => void;
  unreadCount: number;
  onMarkNotificationsRead?: () => void;
  onQuickRoleSwitch?: (role: 'citizen' | 'officer' | 'admin', departmentId?: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function Header({
  user,
  notifications,
  onLogout,
  onRefreshData,
  unreadCount,
  onMarkNotificationsRead,
  onQuickRoleSwitch,
  theme = 'dark',
  onToggleTheme,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && onMarkNotificationsRead) {
      onMarkNotificationsRead();
    }
  };

  const roleLabels: Record<string, { label: string; bg: string; text: string }> = {
    citizen: { label: 'Citizen Portal', bg: theme === 'light' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', text: theme === 'light' ? 'text-emerald-700' : 'text-emerald-300' },
    officer: { label: `Officer Panel (${user?.departmentId})`, bg: theme === 'light' ? 'bg-sky-500/10 text-sky-700 border-sky-500/20' : 'bg-sky-500/15 text-sky-300 border-sky-500/20', text: theme === 'light' ? 'text-sky-700' : 'text-sky-300' },
    admin: { label: 'Super Admin Console', bg: theme === 'light' ? 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20', text: theme === 'light' ? 'text-indigo-700' : 'text-indigo-300' },
  };

  const activeRole = user?.role || 'citizen';
  const roleConfig = roleLabels[activeRole];

  return (
    <header className={`${theme === 'light' ? 'bg-white/85 border-slate-200 text-slate-800' : 'bg-[#040814]/75 border-white/10 text-white'} backdrop-blur-md border-b sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex items-center justify-center shadow-md border ${theme === 'light' ? 'bg-sky-500/10 border-sky-200' : 'bg-gradient-to-tr from-sky-500/10 to-sky-600/25 border-sky-500/30'}`}>
              <Shield className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            </div>
            <div>
              <span className="font-mono text-[9px] tracking-widest text-sky-500 dark:text-sky-400 block font-semibold">GOVERNMENT OF INDIA</span>
              <h1 className={`font-sans font-bold text-base tracking-tight leading-none ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>CivicLens AI</h1>
              <p className={`text-[10px] mt-0.5 font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Smart Governance Complaint System</p>
            </div>
          </div>

          {/* User Section & Notification Controls */}
          {user && (
            <div className="flex items-center gap-4">
              {/* Dev Simulation switcher tool */}
              {onQuickRoleSwitch && (
                <div className={`hidden lg:flex items-center gap-1.5 p-1.5 rounded-xl text-[11px] backdrop-blur-sm border ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                  <span className="text-slate-500 px-1.5 font-semibold font-mono uppercase tracking-wider text-[9px]">Demo Roles:</span>
                  <button
                    onClick={() => onQuickRoleSwitch('citizen')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${user.role === 'citizen' ? 'bg-sky-500 text-slate-950 font-bold shadow-xs' : theme === 'light' ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    Citizen
                  </button>
                  
                  {/* Officer role selector with dropdown for departments */}
                  <div className="relative flex items-center gap-1">
                    <button
                      onClick={() => onQuickRoleSwitch('officer', user.departmentId || 'PWD')}
                      className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${user.role === 'officer' ? 'bg-sky-500 text-slate-950 font-bold shadow-xs' : theme === 'light' ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      Officer {user.role === 'officer' ? `(${user.departmentId})` : ''}
                    </button>
                    {user.role === 'officer' && (
                      <select
                        value={user.departmentId || 'PWD'}
                        onChange={(e) => onQuickRoleSwitch('officer', e.target.value)}
                        className={`text-[10px] py-0.5 px-1 rounded border font-semibold cursor-pointer outline-none ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900 border-white/10 text-sky-400'}`}
                      >
                        <option value="PWD">PWD (Roads)</option>
                        <option value="MUN">MUN (Garbage)</option>
                        <option value="ELE">ELE (Lights)</option>
                        <option value="WAT">WAT (Water)</option>
                        <option value="POL">POL (Pollution)</option>
                        <option value="HEA">HEA (Health)</option>
                        <option value="AGR">AGR (Agri)</option>
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => onQuickRoleSwitch('admin')}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${user.role === 'admin' ? 'bg-sky-500 text-slate-950 font-bold shadow-xs' : theme === 'light' ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    Admin
                  </button>
                </div>
              )}

              {/* Theme Toggle */}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${theme === 'light' ? 'text-slate-600 hover:bg-slate-100 border-slate-200 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
                </button>
              )}

              {/* Reload database manual button */}
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  title="Force DB Refresh"
                  className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${theme === 'light' ? 'text-slate-600 hover:bg-slate-100 border-slate-200 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
              )}

              {/* Notification bell */}
              <div className="relative z-50">
                <button
                  onClick={handleBellClick}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${theme === 'light' ? 'text-slate-600 hover:bg-slate-100 border-slate-200 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-md border border-slate-950 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Panel overlay */}
                {showNotifications && (
                  <div className={`absolute right-0 mt-3 w-80 border rounded-xl shadow-xl z-[100] overflow-hidden divide-y animate-scaleIn backdrop-blur-md ${theme === 'light' ? 'bg-white border-slate-200 divide-slate-100 text-slate-800' : 'bg-[#080d19]/95 border-white/10 divide-white/5 text-slate-200'}`}>
                    <div className={`px-4 py-3 flex items-center justify-between border-b ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                      <span className={`font-semibold text-xs ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Notifications</span>
                      <span className="text-[10px] text-sky-500 font-bold">{unreadCount} new</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-500">
                          No notifications to display
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className={`p-3.5 transition-colors border-b ${theme === 'light' ? (notif.isRead ? 'bg-transparent border-slate-100' : 'bg-sky-500/5 border-slate-100') : (notif.isRead ? 'bg-transparent border-white/5' : 'bg-sky-500/5 border-white/5')}`}>
                            <div className="flex justify-between items-start mb-0.5">
                              <span className={`font-semibold text-[11px] ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{notif.title}</span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`text-[10px] leading-normal ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>{notif.message}</p>
                            {notif.complaintId && (
                              <span className={`inline-block mt-1 font-mono text-[8px] border px-1.5 py-0.2 rounded font-semibold ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                                {notif.complaintId}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Identity and Swapper */}
              <div className={`flex items-center gap-2.5 pl-2 border-l ${theme === 'light' ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-medium text-slate-500 tracking-tight block">
                    {user.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold block max-w-28 truncate ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{user.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${roleConfig.bg}`}>
                      {roleConfig.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className={`border p-2 rounded-lg transition-colors cursor-pointer ${theme === 'light' ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'}`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
