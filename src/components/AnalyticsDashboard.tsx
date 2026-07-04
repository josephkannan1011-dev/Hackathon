import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Shield, CheckCircle, Clock, AlertTriangle, Building, Zap, TrendingUp, Calendar } from 'lucide-react';

interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  avgResolutionHours: number;
  complianceRate: number;
}

interface AnalyticsData {
  metrics: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    rejected: number;
    escalated: number;
    slaBreachedCount: number;
  };
  departmentStats: DepartmentStat[];
  recentLogs: any[];
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#94a3b8'];

export default function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const { metrics, departmentStats, recentLogs } = data;

  // Compile pie-chart data for complaint states
  const pieData = [
    { name: 'Completed', value: metrics.completed },
    { name: 'In Progress', value: metrics.inProgress },
    { name: 'New/Unassigned', value: metrics.pending },
    { name: 'Rejected', value: metrics.rejected },
  ].filter(item => item.value > 0);

  // Compile chart data for SLA Compliance rate by Department
  const complianceChartData = departmentStats.map(d => ({
    name: d.departmentId,
    nameFull: d.departmentName,
    'SLA Compliance %': d.complianceRate,
    'Avg Resolving Hours': d.avgResolutionHours,
  }));

  // Compile chart data for workload by Department
  const workloadChartData = departmentStats.map(d => ({
    name: d.departmentId,
    'Total Complaints': d.total,
    Completed: d.completed,
    Pending: d.pending + d.inProgress,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-slate-100">
        {/* KPI 1 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reports</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white font-display">{metrics.total}</span>
            <p className="text-[9px] text-slate-400 mt-0.5">Dispatched dossiers</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 font-display">{metrics.completed}</span>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}% success rate
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400 font-display">{metrics.inProgress}</span>
            <p className="text-[9px] text-slate-400 mt-0.5">Active inspection & labor</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unassigned</span>
            <AlertTriangle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-blue-400 font-display">{metrics.pending}</span>
            <p className="text-[9px] text-slate-400 mt-0.5">Awaiting first sorting</p>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between border border-red-500/15 bg-red-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-red-400 font-display">{metrics.escalated}</span>
            <p className="text-[9px] text-red-400/80 mt-0.5">Breached tier SLAs</p>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="glass-panel p-4 rounded-xl shadow-lg flex flex-col justify-between border border-indigo-500/15 bg-indigo-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">SLA Breach</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-indigo-400 font-display">{metrics.slaBreachedCount}</span>
            <p className="text-[9px] text-indigo-400/80 mt-0.5">Active timeouts</p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-100">
        {/* Compliance Rates Bar Chart */}
        <div className="glass-panel p-5 rounded-xl shadow-lg lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h4 className="font-semibold text-white text-xs font-display">Departmental Performance Rates</h4>
              <p className="text-[10px] text-slate-400">Compliance score % and average resolution times in hours</p>
            </div>
            <TrendingUp className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', backgroundColor: '#090d16', borderColor: '#ffffff20', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                <Bar dataKey="SLA Compliance %" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Resolving Hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="glass-panel p-5 rounded-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h4 className="font-semibold text-white text-xs font-display">Dossier Status Breakdown</h4>
              <p className="text-[10px] text-slate-400">Visual mapping of overall states</p>
            </div>
            <Calendar className="w-4.5 h-4.5 text-slate-400" />
          </div>
          <div className="h-48 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', backgroundColor: '#090d16', borderColor: '#ffffff20', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-400 text-xs">No active data points seeded</span>
            )}
          </div>
          {/* Pie Legends */}
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-medium">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-100">
        <div className="glass-panel p-5 rounded-xl shadow-lg space-y-4 flex-1">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h4 className="font-semibold text-white text-xs font-display">Volume Burden by Department</h4>
              <p className="text-[10px] text-slate-400">Comparison of total completed vs pending complaints</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', backgroundColor: '#090d16', borderColor: '#ffffff20', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Completed" stackId="a" fill="#10b981" />
                <Bar dataKey="Pending" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed department metrics table */}
        <div className="glass-panel p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2 flex-1">
          <h4 className="font-semibold text-white text-xs font-display">Department Operational Ledger</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono text-[9px] font-bold bg-white/5">
                  <th className="py-2.5 px-3">Dept ID</th>
                  <th className="py-2.5 px-3">Department Name</th>
                  <th className="py-2.5 px-3 text-center">Total</th>
                  <th className="py-2.5 px-3 text-center">Resolved</th>
                  <th className="py-2.5 px-3 text-center">In Labor</th>
                  <th className="py-2.5 px-3 text-center">SLA Compliance</th>
                  <th className="py-2.5 px-3 text-right">Avg Res. Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                {departmentStats.map((d) => (
                  <tr key={d.departmentId} className="hover:bg-white/2 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{d.departmentId}</td>
                    <td className="py-2.5 px-3 text-slate-200">{d.departmentName}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{d.total}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{d.completed}</td>
                    <td className="py-2.5 px-3 text-center text-amber-400 font-semibold">{d.inProgress}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold border ${d.complianceRate >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {d.complianceRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">{d.avgResolutionHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
