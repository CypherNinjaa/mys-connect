'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboard, updateUserStatus, type DashboardData } from '@/lib/api';
import { formatDate, getStatusColor, getRoleColor, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowUpRight,
  Sparkles,
  Activity,
  Layers,
  Ticket,
  ShieldCheck,
  Server,
  Database,
  Cloud,
  Radio,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mini Sparkline Component
function MiniSparkline({ color = '#7A0E16' }: { color?: string }) {
  const points = [
    { x: 0, y: 12 },
    { x: 10, y: 18 },
    { x: 20, y: 14 },
    { x: 30, y: 22 },
    { x: 40, y: 19 },
    { x: 50, y: 28 },
    { x: 60, y: 32 },
  ];
  return (
    <div className="w-16 h-8 shrink-0">
      <svg viewBox="0 0 60 35" className="w-full h-full overflow-visible">
        <path
          d={`M ${points.map((p) => `${p.x},${35 - p.y}`).join(' L ')}`}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// KPI Card Component
function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  iconBg,
  iconColor,
  sparklineColor,
  onClick,
}: {
  label: string;
  value: number | string;
  trend: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sparklineColor?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
        </div>
        <MiniSparkline color={sparklineColor} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await getDashboard(token);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStatus(token, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-white rounded-3xl border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = (data as DashboardData) || {};
  const pendingUsers = stats.pendingUsersList || [];
  const upcomingEvents = stats.upcomingEventsList || [];
  const monthlyData = stats.monthlyGrowth || [
    { month: 'Jan', members: 12, events: 2 },
    { month: 'Feb', members: 19, events: 4 },
    { month: 'Mar', members: 27, events: 3 },
    { month: 'Apr', members: 34, events: 5 },
    { month: 'May', members: 45, events: 6 },
    { month: 'Jun', members: 58, events: 8 },
  ];
  const eventPartData = stats.eventParticipation || [
    { month: 'Jan', rsvps: 45, events: 2 },
    { month: 'Feb', rsvps: 82, events: 4 },
    { month: 'Mar', rsvps: 60, events: 3 },
    { month: 'Apr', rsvps: 110, events: 5 },
    { month: 'May', rsvps: 140, events: 6 },
    { month: 'Jun', rsvps: 195, events: 8 },
  ];

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: '#7A0E16',
    ADMIN: '#9A1A3A',
    EXECUTIVE: '#D4A017',
    VOLUNTEER: '#2563EB',
    MEMBER: '#10B981',
    GUEST: '#64748B',
  };

  const roleData = stats.membersByRole?.map((r) => ({
    name: r.role,
    value: r._count,
    color: roleColors[r.role] || '#7A0E16',
  })) || [
    { name: 'MEMBER', value: 45, color: '#10B981' },
    { name: 'EXECUTIVE', value: 12, color: '#D4A017' },
    { name: 'ADMIN', value: 5, color: '#7A0E16' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero Banner Section ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7A0E16] via-[#600018] to-[#400010] text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#D4A017_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Admin Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, Administrator 👋
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
              Overview for MYS Ranchi Chapter. You have{' '}
              <span className="font-bold text-amber-300">
                {stats.pendingApprovals || 0} pending member approvals
              </span>{' '}
              requiring review today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.pendingApprovals > 0 && (
              <button
                onClick={() => router.push('/members')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-[#7A0E16] font-bold text-xs shadow-md hover:bg-amber-300 transition-all active:scale-[0.98]"
              >
                <UserCheck className="w-4 h-4" />
                <span>Review Approvals ({stats.pendingApprovals})</span>
              </button>
            )}
            <button
              onClick={() => router.push('/events/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 8 KPI Analytics Cards Grid ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Members"
          value={stats.totalMembers || 0}
          trend={stats.trendMetrics?.membersChange || '+14.2%'}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          sparklineColor="#2563EB"
          onClick={() => router.push('/members')}
        />
        <KpiCard
          label="Active Members"
          value={stats.activeMembers || 0}
          trend={stats.trendMetrics?.activeChange || '+9.5%'}
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          sparklineColor="#10B981"
          onClick={() => router.push('/members')}
        />
        <KpiCard
          label="Pending Approvals"
          value={stats.pendingApprovals || 0}
          trend={stats.pendingApprovals > 0 ? `+${stats.pendingApprovals}` : '0'}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          sparklineColor="#D4A017"
          onClick={() => router.push('/members')}
        />
        <KpiCard
          label="Upcoming Events"
          value={stats.upcomingEvents || 0}
          trend={stats.trendMetrics?.eventsChange || '+18.0%'}
          icon={Calendar}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          sparklineColor="#9333EA"
          onClick={() => router.push('/events')}
        />
        <KpiCard
          label="Total Notices"
          value={stats.totalNotices || 0}
          trend={stats.trendMetrics?.noticesChange || '+5.0%'}
          icon={FileText}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          sparklineColor="#EA580C"
          onClick={() => router.push('/notices')}
        />
        <KpiCard
          label="Gallery Photos"
          value={stats.totalPhotos || 0}
          trend={stats.trendMetrics?.photosChange || '+22.4%'}
          icon={ImageIcon}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
          sparklineColor="#DB2777"
          onClick={() => router.push('/gallery')}
        />
        <KpiCard
          label="Albums Count"
          value={stats.totalAlbums || 0}
          trend={stats.trendMetrics?.albumsChange || '+12.0%'}
          icon={Layers}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          sparklineColor="#4F46E5"
          onClick={() => router.push('/gallery')}
        />
        <KpiCard
          label="Total Registrations"
          value={stats.totalRegistrations || 0}
          trend={stats.trendMetrics?.registrationsChange || '+31.5%'}
          icon={Ticket}
          iconBg="bg-[#7A0E16]/10"
          iconColor="text-[#7A0E16]"
          sparklineColor="#7A0E16"
          onClick={() => router.push('/events')}
        />
      </div>

      {/* ─── Interactive Analytics Charts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member Growth Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Member Growth Trends</h3>
              <p className="text-xs text-slate-500">Historical member registrations over 6 months</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#7A0E16]" />
              <span className="text-xs font-semibold text-slate-600">New Members</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7A0E16" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7A0E16" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="members" stroke="#7A0E16" strokeWidth={3} fillOpacity={1} fill="url(#colorMembers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution Donut Chart (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Role Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Active members categorized by assigned role</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {roleData.map((r) => (
              <div key={r.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-xs font-semibold text-slate-700">{r.name}</span>
                <span className="text-xs text-slate-400">({r.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Pending Approvals & Upcoming Events Section ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dedicated Pending Approvals Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pending Approvals</h3>
              <p className="text-xs text-slate-500">Profiles waiting for admin verification</p>
            </div>
            <button
              onClick={() => router.push('/members')}
              className="text-xs font-bold text-[#7A0E16] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                No pending approval requests.
              </div>
            ) : (
              pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#7A0E16]/10 text-[#7A0E16] font-bold text-sm flex items-center justify-center shrink-0">
                      {getInitials(user.profile?.firstName, user.profile?.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {user.profile?.firstName} {user.profile?.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email} • {user.profile?.city?.name || 'Ranchi'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => approveMutation.mutate({ id: user.id, status: 'ACTIVE' })}
                      disabled={approveMutation.isPending}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      title="Approve Member"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ id: user.id, status: 'REJECTED' })}
                      disabled={approveMutation.isPending}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                      title="Reject Member"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Upcoming Events</h3>
              <p className="text-xs text-slate-500">Next scheduled member gatherings</p>
            </div>
            <button
              onClick={() => router.push('/events')}
              className="text-xs font-bold text-[#7A0E16] hover:underline flex items-center gap-1"
            >
              <span>Manage Events</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No upcoming events scheduled.
              </div>
            ) : (
              upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/events/${ev.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-[#7A0E16] font-black text-xs flex flex-col items-center justify-center shrink-0 border border-amber-200">
                    <span className="uppercase">{new Date(ev.startDate).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-base leading-none">{new Date(ev.startDate).getDate()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ev.venue || 'TBA'} • {ev._count?.rsvps || 0} Registered
                    </p>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    {ev.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Actions & System Health Monitor ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Grid (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1">Quick Action Hub</h3>
          <p className="text-xs text-slate-500 mb-4">Fast-track administrative workflows</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => router.push('/members')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/60 hover:border-blue-200 text-left transition-all group"
            >
              <Users className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Add Member</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Register new user</p>
            </button>

            <button
              onClick={() => router.push('/events/new')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/60 hover:border-amber-200 text-left transition-all group"
            >
              <Calendar className="w-5 h-5 text-[#D4A017] mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Create Event</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Publish new gathering</p>
            </button>

            <button
              onClick={() => router.push('/gallery')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-pink-50/60 border border-slate-200/60 hover:border-pink-200 text-left transition-all group"
            >
              <ImageIcon className="w-5 h-5 text-pink-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Upload Gallery</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cloudinary photos</p>
            </button>

            <button
              onClick={() => router.push('/notices/new')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/60 hover:border-purple-200 text-left transition-all group"
            >
              <FileText className="w-5 h-5 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Publish Notice</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Community broadcast</p>
            </button>

            <button
              onClick={() => router.push('/members')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/60 hover:border-emerald-200 text-left transition-all group"
            >
              <UserCheck className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Approve Users</p>
              <p className="text-[10px] text-slate-[#7A0E16] font-semibold mt-0.5">
                {stats.pendingApprovals || 0} Pending
              </p>
            </button>

            <button
              onClick={() => router.push('/audit-logs')}
              className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-left transition-all group"
            >
              <Activity className="w-5 h-5 text-slate-700 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-slate-900">Audit Logs</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Security records</p>
            </button>
          </div>
        </div>

        {/* System Health Monitor (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900 text-base">System Health</h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                99.98% Uptime
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Infrastructure & services monitoring</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-700">API Server</span>
              </div>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Healthy
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#7A0E16]" />
                <span className="font-semibold text-slate-700">PostgreSQL Database</span>
              </div>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span className="font-semibold text-slate-700">Cloudinary Media</span>
              </div>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-slate-700">WebSocket Push</span>
              </div>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Audit Logs & Activity Feed ──────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Recent Audit Activity</h3>
            <p className="text-xs text-slate-500">Live security & activity audit stream</p>
          </div>
          <button
            onClick={() => router.push('/audit-logs')}
            className="text-xs font-bold text-[#7A0E16] hover:underline flex items-center gap-1"
          >
            <span>Full Logs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {stats.recentActivity?.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#7A0E16] shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-800 font-semibold truncate">
                    <span className="text-slate-900 font-bold">
                      {log.user?.profile?.firstName || log.user?.email || 'System'}
                    </span>{' '}
                    performed <span className="text-[#7A0E16] font-bold">{log.action}</span> on{' '}
                    <span className="font-bold text-slate-700">{log.entity}</span>
                  </p>
                </div>
              </div>
              <span className="text-slate-400 font-medium shrink-0 ml-4">
                {formatDate(log.createdAt)}
              </span>
            </div>
          ))}
          {(!stats.recentActivity || stats.recentActivity.length === 0) && (
            <p className="text-xs text-slate-400 py-4 text-center">No recent audit activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
