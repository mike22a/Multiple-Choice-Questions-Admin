'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { 
  Users, 
  Plus, 
  Search, 
  Upload, 
  AlertCircle,
  X,
  Check,
  UserPlus,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';

const participantSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  locale: z.enum(['en', 'id']).default('id'),
});

type ParticipantFormValues = z.infer<typeof participantSchema>;

interface Participant {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  locale: string;
  createdAt: string;
}

export default function ParticipantsPage() {
  const tc = useTranslations('Common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // CSV Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failureCount: number;
    totalCount: number;
    errors: Array<{ rowNum: number; email?: string; username?: string; error: string }>;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
  });

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/users');
      const data = res?.data || res;
      setParticipants(data?.participants || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
  }, []);

  const openCreateModal = () => {
    reset({
      username: '',
      email: '',
      password: '',
      fullName: '',
      locale: 'id',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ParticipantFormValues) => {
    setIsSubmitLoading(true);
    try {
      await apiClient('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setIsModalOpen(false);
      loadParticipants();
    } catch (err: any) {
      alert(err?.message || 'Failed to register participant');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const toggleStatus = async (user: Participant) => {
    try {
      const res = await apiClient(`/api/admin/users/${user.id}/activate`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.isActive }),
      });
      const data = res?.data || res;
      setParticipants(participants.map(p => p.id === user.id ? { ...p, isActive: data.isActive } : p));
    } catch (err: any) {
      alert(err?.message || 'Failed to update activation status');
    }
  };

  // CSV Upload Trigger
  const triggerCsvSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await apiClient('/api/admin/users/import', {
        method: 'POST',
        body: formData,
      });
      setImportResult(result);
      loadParticipants();
    } catch (err: any) {
      alert(err?.message || 'Failed to import CSV file');
    } finally {
      setIsImporting(false);
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Participant Directory</h1>
          <p className="mt-2 text-slate-400">Add, activate/deactivate, and batch import candidate lists.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* CSV File input hidden */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />

          <button
            onClick={triggerCsvSelect}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>{isImporting ? 'Importing...' : 'Import CSV'}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Register Candidate</span>
          </button>
        </div>
      </div>

      {/* CSV Import Results Banner */}
      {importResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
              <span>CSV Import Results Summary</span>
            </h3>
            <button 
              onClick={() => setImportResult(null)}
              className="text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 grid-cols-3 text-center">
            <div className="rounded-xl bg-slate-950/40 p-4 border border-slate-900/50">
              <p className="text-xs text-slate-500 font-medium">Total Rows</p>
              <p className="text-xl font-bold text-white mt-1">{importResult.totalCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 p-4 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/80 font-medium">Successful</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{importResult.successCount}</p>
            </div>
            <div className="rounded-xl bg-rose-500/5 p-4 border border-rose-500/10">
              <p className="text-xs text-rose-500/80 font-medium">Failed</p>
              <p className="text-xl font-bold text-rose-400 mt-1">{importResult.failureCount}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              <p className="font-bold text-rose-400">Failed rows info:</p>
              {importResult.errors.slice(0, 10).map((err, i) => (
                <div key={i} className="flex gap-2 text-slate-400">
                  <span className="text-slate-500 shrink-0">Row {err.rowNum}:</span>
                  <span>{err.email || err.username || 'unknown'} - {err.error}</span>
                </div>
              ))}
              {importResult.errors.length > 10 && (
                <p className="text-[10px] text-slate-500 italic">...and {importResult.errors.length - 10} more errors.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter and search bar */}
      <div className="flex max-w-md items-center gap-2 rounded-xl border border-slate-900 bg-slate-900/30 px-3.5 py-2.5 backdrop-blur-xl">
        <Search className="h-5 w-5 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Search name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
        />
      </div>

      {/* Participants Table */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 text-sm flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : filteredParticipants.length > 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/20">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Username</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Locale</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredParticipants.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/20 transition">
                    <td className="py-4 px-6 font-semibold text-white">{user.fullName}</td>
                    <td className="py-4 px-6 text-slate-300">{user.username}</td>
                    <td className="py-4 px-6 text-slate-400">{user.email}</td>
                    <td className="py-4 px-6 text-slate-400 uppercase">{user.locale}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => toggleStatus(user)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${user.isActive ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <Users className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">No candidates found</h3>
          <p className="mt-1 text-sm">Create or upload candidate lists to start quizzes.</p>
        </div>
      )}

      {/* Registration Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">Register Candidate</h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('fullName')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.fullName && <p className="text-xs text-rose-400">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Username</label>
                <input
                  type="text"
                  placeholder="johndoe"
                  {...register('username')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.username && <p className="text-xs text-rose-400">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Locale / Language</label>
                <select
                  {...register('locale')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <span>Register</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
