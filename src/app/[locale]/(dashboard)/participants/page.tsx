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
  FileSpreadsheet,
  FolderTree,
  Lock,
  ShieldAlert,
  Info
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  depth: number;
  path: string;
  is_system: boolean;
}

interface UserCategoryAccess {
  id: string;
  category_id: string;
  created_at: string;
  quiz_categories: {
    id: string;
    name: string;
    slug: string;
    depth: number;
    path: string;
  };
}

const participantSchema = z.object({
  username: z.string().min(3, 'usernameMin'),
  email: z.string().email('invalidEmail'),
  password: z.string().min(6, 'passwordMin'),
  fullName: z.string().min(1, 'fullNameRequired'),
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
  const tPart = useTranslations('Participants');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const itemsPerPage = 10;

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

  // Category Access Control States
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedAccessUser, setSelectedAccessUser] = useState<Participant | null>(null);
  const [userAccessList, setUserAccessList] = useState<UserCategoryAccess[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [isAccessActionLoading, setIsAccessActionLoading] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
  });

  const loadParticipants = async (page = 1, searchQuery = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const res = await apiClient(`/api/admin/users?${params.toString()}`);
      const data = res?.data || res;
      setParticipants(data?.participants || []);
      setTotalParticipants(data?.pagination?.total || 0);
      setTotalPages(Math.ceil((data?.pagination?.total || 0) / itemsPerPage));
    } catch (err: any) {
      setError(err?.message || tPart('failedLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadParticipants(currentPage, search);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [currentPage, search]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

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
      alert(err?.message || tPart('failedRegister'));
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
      alert(err?.message || tPart('failedToggleStatus'));
    }
  };

  const fetchAllCategories = async () => {
    try {
      const res = await apiClient('/api/admin/categories');
      const data = res?.data || res;
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const openCategoryAccessModal = async (user: Participant) => {
    setSelectedAccessUser(user);
    setIsAccessModalOpen(true);
    setIsLoadingAccess(true);
    if (allCategories.length === 0) {
      await fetchAllCategories();
    }
    try {
      const res = await apiClient(`/api/admin/users/${user.id}/category-access`);
      const data = res?.data || res;
      setUserAccessList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert(err?.message || tPart('failedLoadAccess'));
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const handleToggleAccess = async (category: Category) => {
    if (!selectedAccessUser) return;
    
    const isDirectlyAssigned = userAccessList.some((a) => a.category_id === category.id);
    
    setIsAccessActionLoading(category.id);
    try {
      if (isDirectlyAssigned) {
        await apiClient(`/api/admin/users/${selectedAccessUser.id}/category-access/${category.id}`, {
          method: 'DELETE',
        });
      } else {
        await apiClient(`/api/admin/users/${selectedAccessUser.id}/category-access`, {
          method: 'POST',
          body: JSON.stringify({ category_id: category.id }),
        });
      }
      
      const res = await apiClient(`/api/admin/users/${selectedAccessUser.id}/category-access`);
      const data = res?.data || res;
      setUserAccessList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      alert(err?.message || tPart('failedUpdateAccess'));
    } finally {
      setIsAccessActionLoading(null);
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
      alert(err?.message || tPart('failedImport'));
    } finally {
      setIsImporting(false);
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredParticipants = participants;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i >= 1) pages.push(i);
    }
    
    return pages.map(page => (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        className={`rounded-xl px-3 py-1.5 font-bold transition ${
          currentPage === page
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'border border-slate-900 bg-slate-900/40 text-slate-400 hover:bg-slate-900 hover:text-white'
        }`}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{tPart('title')}</h1>
          <p className="mt-2 text-slate-400">{tPart('subtitle')}</p>
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
            <span>{isImporting ? tc('loading') : tPart('importCsv')}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 hover:brightness-110 active:scale-[0.98] transition"
          >
            <Plus className="h-4 w-4" />
            <span>{tPart('addParticipant')}</span>
          </button>
        </div>
      </div>

      {/* CSV Import Results Banner */}
      {importResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" />
              <span>{tPart('csvResultsSummary')}</span>
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
              <p className="text-xs text-slate-500 font-medium">{tPart('totalRows')}</p>
              <p className="text-xl font-bold text-white mt-1">{importResult.totalCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-500/5 p-4 border border-emerald-500/10">
              <p className="text-xs text-emerald-500/80 font-medium">{tPart('successful')}</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{importResult.successCount}</p>
            </div>
            <div className="rounded-xl bg-rose-500/5 p-4 border border-rose-500/10">
              <p className="text-xs text-rose-500/80 font-medium">{tPart('failed')}</p>
              <p className="text-xl font-bold text-rose-400 mt-1">{importResult.failureCount}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              <p className="font-bold text-rose-400">{tPart('failedRowsInfo')}</p>
              {importResult.errors.slice(0, 10).map((err, i) => (
                <div key={i} className="flex gap-2 text-slate-400">
                  <span className="text-slate-500 shrink-0">Row {err.rowNum}:</span>
                  <span>{err.email || err.username || 'unknown'} - {err.error}</span>
                </div>
              ))}
              {importResult.errors.length > 10 && (
                <p className="text-[10px] text-slate-500 italic">{tPart('andMoreErrors', { count: importResult.errors.length - 10 })}</p>
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
          placeholder={tPart('searchPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
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
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl overflow-hidden w-full min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/20">
                    <th className="py-4 px-6">{tPart('fullName')}</th>
                    <th className="py-4 px-6">{tPart('username')}</th>
                    <th className="py-4 px-6">{tPart('email')}</th>
                    <th className="py-4 px-6">{tPart('language')}</th>
                    <th className="py-4 px-6">{tPart('status')}</th>
                    <th className="py-4 px-6 text-right">{tPart('actions')}</th>
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
                          {user.isActive ? tPart('active') : tPart('inactive')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                           onClick={() => openCategoryAccessModal(user)}
                           className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 mr-2 transition"
                        >
                          {tPart('access')}
                        </button>
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${user.isActive ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10' : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'}`}
                        >
                          {user.isActive ? tPart('deactivate') : tPart('activate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination UI */}
          {totalParticipants > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900 pt-6 text-sm text-slate-400">
              <div>
                {tc('showingRange', { start: (currentPage - 1) * itemsPerPage + 1, end: Math.min(currentPage * itemsPerPage, totalParticipants), total: totalParticipants })}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    {tc('previous')}
                  </button>
                  
                  {renderPageNumbers()}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    {tc('next')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <Users className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">{tPart('noParticipants')}</h3>
          <p className="mt-1 text-sm">{tPart('noParticipantsSub')}</p>
        </div>
      )}

      {/* Registration Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">{tPart('createTitle')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tPart('fullName')}</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('fullName')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.fullName && <p className="text-xs text-rose-400">{tPart(errors.fullName.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tPart('username')}</label>
                <input
                  type="text"
                  placeholder="johndoe"
                  {...register('username')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.username && <p className="text-xs text-rose-400">{tPart(errors.username.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tPart('email')}</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.email && <p className="text-xs text-rose-400">{tPart(errors.email.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tPart('password')}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.password && <p className="text-xs text-rose-400">{tPart(errors.password.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tPart('language')}</label>
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
                  <span>{tc('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Access Modal */}
      {isAccessModalOpen && selectedAccessUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-[95%] max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{tPart('manageAccess')}</h2>
                <p className="text-xs text-slate-400 mt-1">{tPart('accessControlSub')}</p>
              </div>
              <button 
                onClick={() => {
                  setIsAccessModalOpen(false);
                  setSelectedAccessUser(null);
                  setUserAccessList([]);
                }} 
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoadingAccess ? (
              <div className="flex h-36 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* No restrictions info banner */}
                {userAccessList.length === 0 ? (
                  <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-blue-400 flex gap-2.5">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{tPart('noAccess')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-xs text-emerald-400 flex gap-2.5">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{tPart('grantedCategories')}</p>
                    </div>
                  </div>
                )}

                {/* Categories tree with checkboxes */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{tPart('grantAccessLabel')}</p>
                  
                  {/* Render Sample Tests & Uncategorized as special cases */}
                  <div className="rounded-xl bg-slate-950/30 border border-slate-850 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 opacity-60">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        <span className="font-semibold">Sample Tests</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{tPart('alwaysAccessible')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 opacity-60">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        <span className="font-semibold">Uncategorized</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{tPart('adminOnly')}</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-850/50 mt-3">
                    {allCategories
                      .filter((c) => !c.is_system) // only show non-system categories
                      .map((category) => {
                        const isDirectlyAssigned = userAccessList.some((a) => a.category_id === category.id);
                        
                        const isInherited = userAccessList.some(
                           (a) => a.category_id !== category.id && category.path.startsWith(a.quiz_categories?.path + '/')
                        );
                        
                        const isChecked = isDirectlyAssigned || isInherited;
                        const isPending = isAccessActionLoading === category.id;

                        // Find which category grants inheritance
                        const inheritingFrom = isInherited
                          ? userAccessList.find(
                              (a) => a.category_id !== category.id && category.path.startsWith(a.quiz_categories?.path + '/')
                            )?.quiz_categories?.name
                          : null;

                        return (
                          <div 
                            key={category.id} 
                            className="py-2.5 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-center">
                              {/* Indent spacing */}
                              <div 
                                className="flex shrink-0" 
                                style={{ width: `${category.depth * 16}px` }} 
                              />
                              {category.depth > 0 && (
                                <div className="w-3 h-5 border-l border-b border-slate-800 -mt-2 mr-1.5 shrink-0" />
                              )}
                              <FolderTree className="h-3.5 w-3.5 text-slate-500 mr-2 shrink-0" />
                              <span className={`font-medium ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                                {category.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isInherited && (
                                <span 
                                  className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"
                                  title={`Access inherited via ${inheritingFrom}`}
                                >
                                  {tPart('inheritedVia', { name: inheritingFrom })}
                                </span>
                              )}

                              <button
                                onClick={() => !isInherited && handleToggleAccess(category)}
                                disabled={isPending || isInherited}
                                className={`h-5 w-5 rounded border flex items-center justify-center transition focus:outline-none ${
                                  isChecked 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'border-slate-800 bg-slate-950 text-transparent hover:border-slate-700'
                                } ${isInherited ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {isPending ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                ) : isChecked ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : null}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAccessModalOpen(false);
                  setSelectedAccessUser(null);
                  setUserAccessList([]);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                {tc('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
