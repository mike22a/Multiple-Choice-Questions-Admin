'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
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
  Users,
  Trash2,
  RotateCcw,
  FileText,
  Layers
} from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(1, 'fullNameRequired'),
  currentPassword: z.string().min(1, 'currentPasswordRequired'),
  newPassword: z.string().min(6, 'newPasswordMin').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const tc = useTranslations('Common');
  const tSet = useTranslations('Settings');
  
  const { profile, setAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'trash'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trash bin states
  const [trashData, setTrashData] = useState<{ quizzes: any[]; questions: any[] }>({ quizzes: [], questions: [] });
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [trashSubTab, setTrashSubTab] = useState<'quizzes' | 'questions'>('quizzes');
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedQuizIds([]);
    setSelectedQuestionIds([]);
  }, [trashSubTab]);

  const loadTrashData = async () => {
    setIsTrashLoading(true);
    setSelectedQuizIds([]);
    setSelectedQuestionIds([]);
    try {
      const res = await apiClient('/api/admin/trash');
      const data = res?.data || res;
      setTrashData({
        quizzes: data?.quizzes || [],
        questions: data?.questions || [],
      });
    } catch (err: any) {
      console.error('Failed to load trash data', err);
    } finally {
      setIsTrashLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrashData();
    }
  }, [activeTab]);

  // Helper for premium dark theme sweet alerts
  const showSwalAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info') => {
    return Swal.fire({
      title,
      text,
      icon,
      background: '#0f172a', // slate-900
      color: '#f8fafc', // slate-50
      confirmButtonColor: '#2563eb', // blue-600
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });
  };

  const handleRestore = async (type: 'quiz' | 'question', id: string, name: string) => {
    const result = await Swal.fire({
      title: tSet('restoreTitle') || 'Restore Content?',
      text: (tSet('restoreConfirm') || 'Are you sure you want to restore "{name}"?').replace('{name}', name),
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#475569',
      confirmButtonText: tc('confirm') || 'Confirm',
      cancelButtonText: tc('cancel') || 'Cancel',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient('/api/admin/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, action: 'restore', id }),
        });
        showSwalAlert(tc('success') || 'Success', tSet('restoreSuccess') || 'Content restored successfully', 'success');
        loadTrashData();
      } catch (err: any) {
        showSwalAlert(tc('error') || 'Error', err.message || 'Failed to restore content', 'error');
      }
    }
  };

  const handleDeleteForever = async (type: 'quiz' | 'question', id: string, name: string) => {
    const result = await Swal.fire({
      title: tSet('deleteForeverTitle') || 'Delete Permanently?',
      text: type === 'quiz'
        ? `Apakah Anda yakin ingin menghapus "${name}" secara permanen beserta seluruh riwayat pengerjaannya? Tindakan ini TIDAK dapat dibatalkan.`
        : `Apakah Anda yakin ingin menghapus "${name}" secara permanen beserta seluruh riwayat jawabannya? Tindakan ini TIDAK dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#475569',
      confirmButtonText: tSet('deleteForeverBtn') || 'Delete Permanently',
      cancelButtonText: tc('cancel') || 'Cancel',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient('/api/admin/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, action: 'delete', id }),
        });
        showSwalAlert(tc('success') || 'Success', tSet('deleteForeverSuccess') || 'Content deleted permanently', 'success');
        loadTrashData();
      } catch (err: any) {
        showSwalAlert(tc('error') || 'Error', err.message || 'Failed to delete content permanently', 'error');
      }
    }
  };

  const handleBulkRestore = async () => {
    const ids = trashSubTab === 'quizzes' ? selectedQuizIds : selectedQuestionIds;
    if (ids.length === 0) return;

    const result = await Swal.fire({
      title: tSet('restoreTitle') || 'Restore Content?',
      text: trashSubTab === 'quizzes'
        ? `Apakah Anda yakin ingin memulihkan ${ids.length} kuis?`
        : `Apakah Anda yakin ingin memulihkan ${ids.length} soal?`,
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#475569',
      confirmButtonText: tc('confirm') || 'Confirm',
      cancelButtonText: tc('cancel') || 'Cancel',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient('/api/admin/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: trashSubTab === 'quizzes' ? 'quiz' : 'question', 
            action: 'restore', 
            ids 
          }),
        });
        showSwalAlert(tc('success') || 'Success', tSet('restoreSuccess') || 'Content restored successfully', 'success');
        loadTrashData();
      } catch (err: any) {
        showSwalAlert(tc('error') || 'Error', err.message || 'Failed to restore content', 'error');
      }
    }
  };

  const handleBulkDeleteForever = async () => {
    const ids = trashSubTab === 'quizzes' ? selectedQuizIds : selectedQuestionIds;
    if (ids.length === 0) return;

    const result = await Swal.fire({
      title: tSet('deleteForeverTitle') || 'Delete Permanently?',
      text: trashSubTab === 'quizzes'
        ? `Apakah Anda yakin ingin menghapus ${ids.length} kuis secara permanen beserta seluruh riwayat pengerjaannya? Tindakan ini TIDAK dapat dibatalkan.`
        : `Apakah Anda yakin ingin menghapus ${ids.length} soal secara permanen beserta seluruh riwayat jawabannya? Tindakan ini TIDAK dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#475569',
      confirmButtonText: tSet('deleteForeverBtn') || 'Delete Permanently',
      cancelButtonText: tc('cancel') || 'Cancel',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });

    if (result.isConfirmed) {
      try {
        await apiClient('/api/admin/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: trashSubTab === 'quizzes' ? 'quiz' : 'question', 
            action: 'delete', 
            ids 
          }),
        });
        showSwalAlert(tc('success') || 'Success', tSet('deleteForeverSuccess') || 'Content deleted permanently', 'success');
        loadTrashData();
      } catch (err: any) {
        showSwalAlert(tc('error') || 'Error', err.message || 'Failed to delete content permanently', 'error');
      }
    }
  };

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccessMsg(tSet('successMessage'));
      reset({ ...data, currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setErrorMsg(err?.message || tSet('failedUpdate'));
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperadmin = profile?.role === 'superadmin';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{tSet('title')}</h1>
        <p className="mt-2 text-slate-400">{tSet('subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-900 pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2 text-sm font-semibold border-b-2 transition ${activeTab === 'profile' ? 'border-blue-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          {tSet('myProfile')}
        </button>
        {isSuperadmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-2 text-sm font-semibold border-b-2 transition ${activeTab === 'system' ? 'border-blue-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            {tSet('adminsRegistry')}
          </button>
        )}
        <button
          onClick={() => setActiveTab('trash')}
          className={`pb-2 text-sm font-semibold border-b-2 transition ${activeTab === 'trash' ? 'border-blue-500 text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          {tSet('trashBin') || 'Trash Bin'}
        </button>
      </div>

      {/* Profile settings Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-xl space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <span>{tSet('profileCredentials')}</span>
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
                <label className="text-sm font-medium text-slate-300">{tSet('username')}</label>
                <input
                  type="text"
                  disabled
                  value={profile?.username || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3.5 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tSet('email')}</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3.5 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tSet('fullName')}</label>
                <input
                  type="text"
                  {...register('fullName')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.fullName && <p className="text-xs text-rose-400">{tSet(errors.fullName.message || '')}</p>}
              </div>

              <div className="space-y-2 border-t border-slate-900/60 pt-4">
                <label className="text-sm font-medium text-slate-300">{tSet('newPassword')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('newPassword')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.newPassword && <p className="text-xs text-rose-400">{tSet(errors.newPassword.message || '')}</p>}
              </div>

              <div className="space-y-2 border-t border-slate-900/60 pt-4">
                <label className="text-sm font-medium text-slate-300">{tSet('currentPassword')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('currentPassword')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.currentPassword && <p className="text-xs text-rose-400">{tSet(errors.currentPassword.message || '')}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition w-full"
              >
                {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                <span>{tSet('saveChanges')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System admins tab (restricted to superadmin) */}
      {activeTab === 'system' && isSuperadmin && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl space-y-6 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>{tSet('registryTitle')}</span>
              </h2>
              <button
                onClick={() => showSwalAlert(tSet('registerAdmin') || 'Register Admin', tSet('registerAdminAlert'), 'info')}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{tSet('registerAdmin')}</span>
              </button>
            </div>

            <div className="overflow-x-auto text-sm text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold uppercase text-slate-500">
                    <th className="pb-3 pr-4">{tSet('fullName')}</th>
                    <th className="pb-3 px-4">{tSet('username')}</th>
                    <th className="pb-3 px-4">{tSet('email')}</th>
                    <th className="pb-3 px-4">{tSet('role')}</th>
                    <th className="pb-3 px-4">{tSet('status')}</th>
                    <th className="pb-3 pl-4 text-right">{tSet('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-slate-300">
                  <tr>
                    <td className="py-4 pr-4 font-bold text-white">{tSet('systemAdmin')}</td>
                    <td className="py-4 px-4 text-slate-400">admin</td>
                    <td className="py-4 px-4 text-slate-400">admin@mcq.com</td>
                    <td className="py-4 px-4 uppercase text-xs text-indigo-400 font-bold">Superadmin</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">{tSet('active')}</span>
                    </td>
                    <td className="py-4 pl-4 text-right text-xs text-slate-500 italic">{tSet('selfProtection')}</td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-4 font-bold text-white">{tSet('guestModerator')}</td>
                    <td className="py-4 px-4 text-slate-400">moderator</td>
                    <td className="py-4 px-4 text-slate-400">moderator@mcq.com</td>
                    <td className="py-4 px-4 uppercase text-xs text-slate-400 font-bold">Admin</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">{tSet('active')}</span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <button className="text-xs font-semibold text-rose-400 hover:underline">{tSet('deactivate')}</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trash Bin settings tab */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl space-y-6 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-950 pb-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setTrashSubTab('quizzes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${trashSubTab === 'quizzes' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white border border-transparent'}`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{tSet('deletedQuizzes') || 'Quizzes'} ({trashData.quizzes.length})</span>
                </button>
                <button
                  onClick={() => setTrashSubTab('questions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${trashSubTab === 'questions' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white border border-transparent'}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{tSet('deletedQuestions') || 'Questions'} ({trashData.questions.length})</span>
                </button>
              </div>
              <button
                onClick={loadTrashData}
                disabled={isTrashLoading}
                className="text-xs text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                {tSet('refresh') || 'Refresh'}
              </button>
            </div>

            {((trashSubTab === 'quizzes' && selectedQuizIds.length > 0) ||
              (trashSubTab === 'questions' && selectedQuestionIds.length > 0)) && (
              <div className="flex items-center gap-3 bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 animate-fadeIn">
                <span className="text-xs text-blue-400 font-semibold">
                  {trashSubTab === 'quizzes' ? selectedQuizIds.length : selectedQuestionIds.length} {trashSubTab === 'quizzes' ? 'Kuis' : 'Soal'} terpilih
                </span>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleBulkRestore}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{tSet('restoreBtn') || 'Restore'}</span>
                  </button>
                  <button
                    onClick={handleBulkDeleteForever}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{tSet('deleteForeverBtnShort') || 'Delete Forever'}</span>
                  </button>
                </div>
              </div>
            )}

            {isTrashLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span className="text-sm text-slate-400">{tSet('loadingTrash') || 'Loading trash...'}</span>
              </div>
            ) : trashSubTab === 'quizzes' ? (
              trashData.quizzes.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Trash2 className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-400">{tSet('emptyQuizzes') || 'No deleted quizzes found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-sm text-left">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 text-xs font-semibold uppercase text-slate-500">
                        <th className="pb-3 pr-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={trashData.quizzes.length > 0 && selectedQuizIds.length === trashData.quizzes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuizIds(trashData.quizzes.map(q => q.id));
                              } else {
                                setSelectedQuizIds([]);
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-900/50 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="pb-3 px-4">{tSet('quizTitleCol') || 'Quiz Title'}</th>
                        <th className="pb-3 px-4 text-center">{tSet('questionsCountCol') || 'Questions'}</th>
                        <th className="pb-3 px-4 text-center">{tSet('attemptsCountCol') || 'Attempts'}</th>
                        <th className="pb-3 px-4">{tSet('deletedAtCol') || 'Deleted At'}</th>
                        <th className="pb-3 pl-4 text-right">{tSet('actionsCol') || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40 text-slate-300">
                      {trashData.quizzes.map((quiz) => (
                        <tr key={quiz.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-4 pr-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedQuizIds.includes(quiz.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQuizIds([...selectedQuizIds, quiz.id]);
                                } else {
                                  setSelectedQuizIds(selectedQuizIds.filter(id => id !== quiz.id));
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-900/50 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 font-bold text-white max-w-xs truncate">{quiz.title}</td>
                          <td className="py-4 px-4 text-slate-400 font-mono text-center">{quiz.question_count}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-mono font-semibold ${quiz.attempt_count > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                              {quiz.attempt_count}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {quiz.deleted_at ? new Date(quiz.deleted_at).toLocaleString() : '-'}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRestore('quiz', quiz.id, quiz.title)}
                                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 transition"
                                title="Restore"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>{tSet('restoreBtn') || 'Restore'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteForever('quiz', quiz.id, quiz.title)}
                                className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/10 transition"
                                title="Delete Forever"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{tSet('deleteForeverBtnShort') || 'Delete Forever'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : trashData.questions.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Trash2 className="mx-auto h-12 w-12 text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">{tSet('emptyQuestions') || 'No deleted questions found'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-sm text-left">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold uppercase text-slate-500">
                      <th className="pb-3 pr-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={trashData.questions.length > 0 && selectedQuestionIds.length === trashData.questions.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQuestionIds(trashData.questions.map(q => q.id));
                            } else {
                              setSelectedQuestionIds([]);
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900/50 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 px-4">{tSet('questionTextCol') || 'Question Text'}</th>
                      <th className="pb-3 px-4">{tSet('quizCol') || 'Quiz'}</th>
                      <th className="pb-3 px-4 text-center">{tSet('responsesCountCol') || 'Responses'}</th>
                      <th className="pb-3 px-4">{tSet('deletedAtCol') || 'Deleted At'}</th>
                      <th className="pb-3 pl-4 text-right">{tSet('actionsCol') || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40 text-slate-300">
                    {trashData.questions.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-950/20 transition-colors">
                        <td className="py-4 pr-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                              } else {
                                setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== q.id));
                              }
                            }}
                            className="rounded border-slate-700 bg-slate-900/50 text-blue-600 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4 font-bold text-white max-w-sm truncate">{q.question_text}</td>
                        <td className="py-4 px-4 text-slate-400 truncate max-w-xs">{q.quiz_title}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-mono font-semibold ${q.response_count > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                            {q.response_count}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400">
                          {q.deleted_at ? new Date(q.deleted_at).toLocaleString() : '-'}
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestore('question', q.id, q.question_text)}
                              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 transition"
                              title="Restore"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>{tSet('restoreBtn') || 'Restore'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteForever('question', q.id, q.question_text)}
                              className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/10 transition"
                              title="Delete Forever"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>{tSet('deleteForeverBtnShort') || 'Delete Forever'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
