'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '@/lib/api';
import { X, AlertCircle } from 'lucide-react';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = ['MEMBER', 'VOLUNTEER', 'EXECUTIVE', 'ADMIN', 'SUPER_ADMIN', 'GUEST'];
const STATUSES = ['ACTIVE', 'PENDING', 'DEACTIVATED', 'REJECTED'];

export function CreateMemberModal({ isOpen, onClose }: CreateMemberModalProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    occupation: '',
    organization: '',
    role: 'MEMBER',
    status: 'ACTIVE',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return createUser(token, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setValidationError(null);
      onClose();
      setForm({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        occupation: '',
        organization: '',
        role: 'MEMBER',
        status: 'ACTIVE',
      });
    },
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (validationError) setValidationError(null);
  };

  const validateAndSubmit = () => {
    setValidationError(null);

    // 1. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email.trim())) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (form.email.length > 150) {
      setValidationError('Email must be under 150 characters.');
      return;
    }

    // 2. First Name validation
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!form.firstName || form.firstName.trim().length < 2) {
      setValidationError('First Name must be at least 2 characters.');
      return;
    }
    if (!nameRegex.test(form.firstName.trim())) {
      setValidationError('First Name must contain letters and spaces only.');
      return;
    }
    if (form.firstName.length > 50) {
      setValidationError('First Name must be under 50 characters.');
      return;
    }

    // 3. Last Name validation
    if (!form.lastName || form.lastName.trim().length < 2) {
      setValidationError('Last Name must be at least 2 characters.');
      return;
    }
    if (!nameRegex.test(form.lastName.trim())) {
      setValidationError('Last Name must contain letters and spaces only.');
      return;
    }
    if (form.lastName.length > 50) {
      setValidationError('Last Name must be under 50 characters.');
      return;
    }

    // 4. Phone validation (Indian Mobile number check if provided)
    if (form.phone) {
      const cleanPhone = form.phone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        setValidationError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
    }

    // 5. Occupation validation
    if (form.occupation) {
      if (form.occupation.length > 100) {
        setValidationError('Occupation must be under 100 characters.');
        return;
      }
      if (!/^[a-zA-Z\s/-]+$/.test(form.occupation.trim())) {
        setValidationError('Occupation must contain letters, spaces, hyphens, or slashes only.');
        return;
      }
    }

    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Add New Member</h3>
            <p className="text-xs text-slate-500">Create member profile and provision Clerk account</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              maxLength={150}
              placeholder="member@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                maxLength={50}
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                name="lastName"
                maxLength={50}
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                maxLength={15}
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Occupation</label>
              <input
                type="text"
                name="occupation"
                maxLength={100}
                placeholder="Business / Engineer"
                value={form.occupation}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">System Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0E16]/20 focus:border-[#7A0E16]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="flex items-start gap-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p>{validationError}</p>
            </div>
          </div>
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p>{(mutation.error as Error).message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={validateAndSubmit}
            disabled={!form.email || !form.firstName || !form.lastName || mutation.isPending}
            className="px-4 py-2 text-xs font-bold bg-[#7A0E16] text-white rounded-xl hover:bg-[#600018] disabled:opacity-50 transition-all shadow-sm"
          >
            {mutation.isPending ? 'Creating...' : 'Create Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
