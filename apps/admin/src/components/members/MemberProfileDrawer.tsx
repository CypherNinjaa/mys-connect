'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMemberDetails, updateUserStatus, updateUserRole, type UserData } from '@/lib/api';
import { formatDate, getInitials, getRoleColor, getStatusColor, getMysDesignationLabel } from '@/lib/utils';
import {
  X,
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
  RefreshCw,
  Phone,
  Mail,
  Building2,
  BadgeCheck,
} from 'lucide-react';

interface MemberProfileDrawerProps {
  memberId: string | null;
  onClose: () => void;
}

export function MemberProfileDrawer({ memberId, onClose }: MemberProfileDrawerProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'professional' | 'address' | 'audit' | 'events'>('overview');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['member-detail', memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await getMemberDetails(token, memberId);
      return res.data;
    },
    enabled: !!memberId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      if (!memberId) return;
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return updateUserStatus(token, memberId, status, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (!memberId) return null;

  const member = data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-black text-xl shrink-0 shadow-lg">
              {member?.profile?.avatarUrl || member?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.profile?.avatarUrl || member.avatarUrl || ''}
                  alt={member.fullName || 'Member Avatar'}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                getInitials(member?.profile?.firstName, member?.profile?.lastName)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white truncate">
                  {member?.profile?.firstName ? `${member.profile.firstName} ${member.profile.lastName || ''}` : member?.email || 'Member Profile'}
                </h2>
                {member?.profileComplete && (
                  <span title="Profile Complete">
                    <BadgeCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 truncate">{member?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/15">
                  ID: {member?.memberId || 'MYS-PENDING'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleColor(member?.role || 'MEMBER')}`}>
                  {member?.role}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(member?.status || 'PENDING')}`}>
                  {member?.status}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {member?.status === 'PENDING' && (
              <>
                <button
                  onClick={() => statusMutation.mutate({ status: 'ACTIVE' })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => statusMutation.mutate({ status: 'REJECTED' })}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}
            {member?.status === 'ACTIVE' && (
              <button
                onClick={() => statusMutation.mutate({ status: 'DEACTIVATED' })}
                disabled={statusMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Deactivate / Suspend</span>
              </button>
            )}
            {member?.status === 'DEACTIVATED' && (
              <button
                onClick={() => statusMutation.mutate({ status: 'ACTIVE' })}
                disabled={statusMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Re-activate</span>
              </button>
            )}
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Header Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 space-x-6 text-xs font-bold text-slate-500 overflow-x-auto shrink-0">
          {[
            { key: 'overview', label: 'Overview', icon: Sparkles },
            { key: 'personal', label: 'Personal', icon: User },
            { key: 'professional', label: 'Business', icon: Briefcase },
            { key: 'address', label: 'Address & Chapter', icon: MapPin },
            { key: 'audit', label: 'Audit Trail', icon: Activity },
            { key: 'events', label: 'Events RSVPs', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3.5 flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  isCurrent ? 'border-[#7A0E16] text-[#7A0E16]' : 'border-transparent hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
              Loading member details...
            </div>
          ) : !member ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Unable to load member profile data.
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Completion Score Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span>Profile Completion Score</span>
                      </span>
                      <span className="text-[#7A0E16]">{member.completionScore || 80}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#7A0E16] transition-all duration-500"
                        style={{ width: `${member.completionScore || 80}%` }}
                      />
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <p className="text-slate-400 font-medium mb-1">Phone Number</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {member.phone || member.profile?.phone || 'Not provided'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <p className="text-slate-400 font-medium mb-1">Chapter / City</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {member.profile?.city?.name || 'Ranchi'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <p className="text-slate-400 font-medium mb-1">Occupation</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {member.profile?.occupation || 'Member'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <p className="text-slate-400 font-medium mb-1">Joined Date</p>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(member.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                    <div>
                      <span className="text-slate-400 font-medium">Full Name</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">
                        {member.profile?.firstName} {member.profile?.lastName}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Email Address</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {member.email}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Date of Birth</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">
                        {member.profile?.dateOfBirth ? formatDate(member.profile.dateOfBirth) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Gender</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Blood Group</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.bloodGroup || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Tab */}
              {activeTab === 'professional' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                    <div>
                      <span className="text-slate-400 font-medium">Occupation</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.occupation || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Organization / Company</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {member.profile?.organization || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Designation (Business)</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.designation || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">MYS Designation</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{getMysDesignationLabel(member.profile?.mysDesignation) || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Bio</span>
                      <p className="text-slate-700 font-medium mt-0.5">{member.profile?.bio || 'No bio available.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Tab */}
              {activeTab === 'address' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
                    <div>
                      <span className="text-slate-400 font-medium">Residential Address</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.address || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">City / Chapter</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.city?.name || 'Ranchi'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">State</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.state || 'Jharkhand'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">PIN Code</span>
                      <p className="text-slate-900 font-bold text-sm mt-0.5">{member.profile?.pinCode || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit History Tab */}
              {activeTab === 'audit' && (
                <div className="space-y-3 text-xs">
                  {member.auditLogs && member.auditLogs.length > 0 ? (
                    member.auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{log.action}</p>
                          <p className="text-[11px] text-slate-500">{log.entity} • ID: {log.entityId || '—'}</p>
                        </div>
                        <span className="text-slate-400 text-[10px]">{formatDate(log.createdAt)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">No audit logs recorded for this member.</p>
                  )}
                </div>
              )}

              {/* Events RSVPs Tab */}
              {activeTab === 'events' && (
                <div className="space-y-3 text-xs">
                  {member.eventRSVPs && member.eventRSVPs.length > 0 ? (
                    member.eventRSVPs.map((rsvp) => (
                      <div key={rsvp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">{rsvp.event?.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {rsvp.event?.venue || 'Venue TBD'} • {formatDate(rsvp.event?.startDate || '')}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-full">
                          {rsvp.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">No event registrations found.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
