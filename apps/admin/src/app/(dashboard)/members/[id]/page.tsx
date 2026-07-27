'use client';

import { use, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMemberDetails, updateUserStatus, type UserData } from '@/lib/api';
import { formatDate, getInitials, getRoleColor, getStatusColor } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  Award,
  Sparkles,
  Phone,
  Mail,
  Building2,
  BadgeCheck,
} from 'lucide-react';

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const memberId = resolvedParams.id;
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'professional' | 'address' | 'audit' | 'events'>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['member-detail', memberId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await getMemberDetails(token, memberId);
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStatus(token, memberId, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const member = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Handoff */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/members')}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl bg-white border border-slate-200 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Member Profile</h1>
          <p className="text-xs text-slate-500">ID: {member?.memberId || memberId}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 animate-pulse text-sm">
          Loading member details...
        </div>
      ) : !member ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Member not found.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-[#7A0E16] text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black text-2xl shrink-0 shadow-xl overflow-hidden">
                {member.profile?.avatarUrl || member.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.profile?.avatarUrl || member.avatarUrl || ''}
                    alt={member.fullName || 'Member Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(member.profile?.firstName, member.profile?.lastName)
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white">
                    {member.profile?.firstName ? `${member.profile.firstName} ${member.profile.lastName || ''}` : member.fullName || member.email}
                  </h2>
                  {member.profileComplete && (
                    <span title="Profile Complete">
                      <BadgeCheck className="w-6 h-6 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1">{member.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/15">
                    Member ID: {member.memberId || 'MYS-PENDING'}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getRoleColor(member.role)}`}>
                    {member.role}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(member.status)}`}>
                    {member.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {member.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => statusMutation.mutate({ status: 'ACTIVE' })}
                    disabled={statusMutation.isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => statusMutation.mutate({ status: 'REJECTED' })}
                    disabled={statusMutation.isPending}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
              {member.status === 'ACTIVE' && (
                <button
                  onClick={() => statusMutation.mutate({ status: 'DEACTIVATED' })}
                  disabled={statusMutation.isPending}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  Suspend / Deactivate
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-8 space-x-8 text-xs font-bold text-slate-500">
            {[
              { key: 'overview', label: 'Overview', icon: Sparkles },
              { key: 'personal', label: 'Personal Information', icon: User },
              { key: 'professional', label: 'Business & Professional', icon: Briefcase },
              { key: 'address', label: 'Address & Chapter', icon: MapPin },
              { key: 'audit', label: 'Audit Trail', icon: Activity },
              { key: 'events', label: 'Event Registrations', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 flex items-center gap-2 border-b-2 transition-all ${
                    isCurrent ? 'border-[#7A0E16] text-[#7A0E16]' : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="p-8 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                    <span className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>Profile Completion Score</span>
                    </span>
                    <span className="text-[#7A0E16] font-black">{member.completionScore || 80}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-[#7A0E16] transition-all duration-500"
                      style={{ width: `${member.completionScore || 80}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 font-medium">Phone</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{member.phone || member.profile?.phone || 'Not provided'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 font-medium">City / Chapter</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{member.profile?.city?.name || 'Ranchi'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 font-medium">Occupation</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{member.profile?.occupation || 'Member'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-slate-400 font-medium">Joined Date</p>
                    <p className="font-bold text-slate-900 text-sm mt-1">{formatDate(member.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium">First Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.firstName || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Last Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.lastName || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date of Birth</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {member.profile?.dateOfBirth ? formatDate(member.profile.dateOfBirth) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Gender</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.gender || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Blood Group</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.bloodGroup || '—'}</p>
                </div>
              </div>
            )}

            {activeTab === 'professional' && (
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium">Occupation</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.occupation || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Organization / Business</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.organization || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Designation</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.designation || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium">Bio</span>
                  <p className="font-medium text-slate-700 mt-1">{member.profile?.bio || 'No bio provided.'}</p>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium">Street Address</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.address || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">City / Chapter</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.city?.name || 'Ranchi'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">State</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{member.profile?.state || 'Jharkhand'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
