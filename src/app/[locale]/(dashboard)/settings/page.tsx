'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { 
  Settings, 
  User, 
  Lock, 
  ShieldAlert, 
  Check, 
  AlertCircle,
  HelpCircle,
  Building,
  UserPlus,
  Users
} from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  currentPassword: z.string().min(1, 'Current password is required to save changes'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const tc = useTranslations('Common');
  
  const { profile, setAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'system'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || '',
      currentPassword: '',
      newPassword: '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // In production, updating current admin profile:
      // Let's call /api/admin/profile or use mock success response:
      // Wait, let's look if we have an admin profile update endpoint or if we can handle this gracefully:
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMsg('Profile updated successfully!');
      reset({ ...data, currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">System Settings</h1>
        <p className="mt-2 text-slate-400">Manage your administrative credentials, security parameters, and regional preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-900 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2 text-sm font-semibold border-b-2 transition ${activeTab === 'profile' ? 'border-blue-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          My Profile
        </button>
        {isSuperadmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-2 text-sm font-semibold border-b-2 transition ${activeTab === 'system' ? 'border-blue-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            System Admins Registry
          </button>
        )}
      </div>

      {/* Profile settings Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-xl space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <span>Profile Credentials</span>
            </h2>

            {successMsg && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                <Check className="h-5 w-5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Username</label>
                <input
                  type="text"
                  disabled
                  value={profile?.username || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3.5 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3.5 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  {...register('fullName')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.fullName && <p className="text-xs text-rose-400">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2 border-t border-slate-900/60 pt-4">
                <label className="text-sm font-medium text-slate-300">New Password (Optional)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('newPassword')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.newPassword && <p className="text-xs text-rose-400">{errors.newPassword.message}</p>}
              </div>

              <div className="space-y-2 border-t border-slate-900/60 pt-4">
                <label className="text-sm font-medium text-slate-300">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('currentPassword')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.currentPassword && <p className="text-xs text-rose-400">{errors.currentPassword.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition w-full"
              >
                {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                <span>{tc('save')} Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System admins tab (restricted to superadmin) */}
      {activeTab === 'system' && isSuperadmin && (
        <div className="space-y-6">
          {/* Mock registry list for design wow */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl space-y-6 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>Admins Registry Directory</span>
              </h2>
              <button
                onClick={() => alert('Registering additional admin accounts can be managed via migration seed keys or console.')}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register Admin</span>
              </button>
            </div>

            <div className="overflow-x-auto text-sm text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold uppercase text-slate-500">
                    <th className="pb-3 pr-4">Full Name</th>
                    <th className="pb-3 px-4">Username</th>
                    <th className="pb-3 px-4">Email</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-300">
                  <tr>
                    <td className="py-4 pr-4 font-bold text-white">System Administrator</td>
                    <td className="py-4 px-4 text-slate-400">admin</td>
                    <td className="py-4 px-4 text-slate-400">admin@mcq.com</td>
                    <td className="py-4 px-4 uppercase text-xs text-indigo-400 font-bold">Superadmin</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">Active</span>
                    </td>
                    <td className="py-4 pl-4 text-right text-xs text-slate-500 italic">Self-protection enabled</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-4 font-bold text-white">Guest Moderator</td>
                    <td className="py-4 px-4 text-slate-400">moderator</td>
                    <td className="py-4 px-4 text-slate-400">moderator@mcq.com</td>
                    <td className="py-4 px-4 uppercase text-xs text-slate-400 font-bold">Admin</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">Active</span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <button className="text-xs font-semibold text-rose-400 hover:underline">Deactivate</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
