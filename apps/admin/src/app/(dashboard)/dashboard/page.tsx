'use client';

import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, type DashboardData } from '@/lib/api';
import { formatDate, getStatusColor, getRoleColor, getInitials } from '@/lib/utils';
import { Users, Calendar, FileText, Image, TrendingUp, Clock } from 'lucide-react';

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await getDashboard(token);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = data as DashboardData;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Members" value={stats?.totalMembers || 0} icon={Users} color="bg-blue-600" />
        <KpiCard label="Active Members" value={stats?.activeMembers || 0} icon={TrendingUp} color="bg-green-600" />
        <KpiCard label="Pending Approvals" value={stats?.pendingApprovals || 0} icon={Clock} color="bg-yellow-600" />
        <KpiCard label="Total Events" value={stats?.totalEvents || 0} icon={Calendar} color="bg-purple-600" />
        <KpiCard label="Upcoming Events" value={stats?.upcomingEvents || 0} icon={Calendar} color="bg-indigo-600" />
        <KpiCard label="Total Notices" value={stats?.totalNotices || 0} icon={FileText} color="bg-orange-600" />
        <KpiCard label="Total Albums" value={stats?.totalAlbums || 0} icon={Image} color="bg-pink-600" />
        <KpiCard label="Total Photos" value={stats?.totalPhotos || 0} icon={Image} color="bg-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Members</h3>
          <div className="space-y-3">
            {stats?.recentMembers?.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-maroon/10 flex items-center justify-center text-sm font-medium text-maroon">
                  {getInitials(member.profile?.firstName, member.profile?.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.profile?.firstName} {member.profile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
              </div>
            ))}
            {(!stats?.recentMembers || stats.recentMembers.length === 0) && (
              <p className="text-sm text-gray-400">No recent members</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats?.recentActivity?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-maroon mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{log.user?.profile?.firstName || log.user?.email || 'System'}</span>{' '}
                    {log.action.toLowerCase().replace(/_/g, ' ')} on {log.entity.toLowerCase()}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            ))}
            {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-sm text-gray-400">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Members by Role */}
      {stats?.membersByRole && stats.membersByRole.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Members by Role</h3>
          <div className="flex flex-wrap gap-3">
            {stats.membersByRole.map((item) => (
              <div key={item.role} className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRoleColor(item.role)}`}>
                  {item.role}
                </span>
                <span className="text-sm font-semibold text-gray-700">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
