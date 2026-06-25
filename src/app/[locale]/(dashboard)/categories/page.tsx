'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Upload, 
  AlertCircle,
  X,
  Check,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Lock,
  FileSpreadsheet,
  Download
} from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'nameRequired').max(255),
  description: z.string().optional().nullable(),
  parent_id: z.preprocess(
    (val) => (val === '' ? null : val),
    z.string().uuid('invalidParent').optional().nullable()
  ),
  order_num: z.number().int().min(0).default(0),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  depth: number;
  path: string;
  order_num: number;
  is_system: boolean;
  created_at: string;
}

export default function CategoriesPage() {
  const tc = useTranslations('Common');
  const tCat = useTranslations('Categories');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);
  const itemsPerPage = 10;

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Tree collapse state (category id -> collapsed boolean)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Add/Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // CSV Import Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const watchParentId = watch('parent_id');

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

  const showSwalConfirm = (title: string, text: string, confirmButtonText = tc('delete') || 'Delete') => {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonColor: '#dc2626', // red-600
      cancelButtonColor: '#334155', // slate-700
      confirmButtonText,
      cancelButtonText: tc('cancel') || 'Cancel',
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });
  };

  const loadAllCategories = async () => {
    try {
      const res = await apiClient('/api/admin/categories');
      const data = res?.data || res;
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load all categories', err);
    }
  };

  const loadCategories = async (page = 1, searchQuery = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const res = await apiClient(`/api/admin/categories?${params.toString()}`);
      const data = res?.data || res;
      setCategories(data?.categories || []);
      setTotalCategories(data?.pagination?.total || 0);
      setTotalPages(Math.ceil((data?.pagination?.total || 0) / itemsPerPage));
    } catch (err: any) {
      setError(err?.message || tCat('failedLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    loadCategories(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    loadAllCategories();
  }, []);

  const handleCategoriesUpdate = () => {
    loadCategories(currentPage, debouncedSearch);
    loadAllCategories();
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = (parentId: string | null = null) => {
    setEditingCategory(null);
    reset({
      name: '',
      description: '',
      parent_id: parentId,
      order_num: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id,
      order_num: category.order_num,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitLoading(true);
    try {
      if (editingCategory) {
        await apiClient(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        await apiClient('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setIsModalOpen(false);
      handleCategoriesUpdate();
      showSwalAlert(tc('success') || 'Success', editingCategory ? tCat('saveSuccess') || 'Category saved successfully' : tCat('createSuccess') || 'Category created successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error') || 'Error', err?.message || tCat('failedSave'), 'error');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.is_system) {
      showSwalAlert(tc('error') || 'Error', tCat('systemDeleteAlert'), 'error');
      return;
    }

    const hasChildren = allCategories.some((c) => c.parent_id === category.id);
    const message = hasChildren 
      ? tCat('deleteWithChildrenAlert', { name: category.name })
      : tCat('deleteCategoryAlert', { name: category.name });

    const result = await showSwalConfirm(tCat('deleteCategory') || tc('delete') || 'Delete', message);
    if (!result.isConfirmed) return;

    try {
      await apiClient(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });
      handleCategoriesUpdate();
      showSwalAlert(tc('success') || 'Success', tCat('deleteSuccess') || 'Category deleted successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error') || 'Error', err?.message || tCat('failedDelete'), 'error');
    }
  };

  // Reorder siblings
  const handleReorder = async (category: Category, direction: 'up' | 'down') => {
    // Find siblings (same parent_id)
    const siblings = allCategories.filter((c) => c.parent_id === category.parent_id);
    const index = siblings.findIndex((c) => c.id === category.id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= siblings.length) return;

    const targetCategory = siblings[newIndex];

    // Swap order_num values
    const orders = [
      { id: category.id, order_num: targetCategory.order_num },
      { id: targetCategory.id, order_num: category.order_num },
    ];

    try {
      await apiClient(`/api/admin/categories/${category.id}/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ orders }),
      });
      handleCategoriesUpdate();
    } catch (err: any) {
      showSwalAlert(tc('error') || 'Error', err?.message || tCat('failedReorder'), 'error');
    }
  };

  // CSV Import handling
  const triggerCsvSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCsvSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportErrors([]);
    setImportPreview([]);

    // Simple raw CSV parse to show a quick preview of rows
    const text = await file.text();
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    const parsedPreview = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const parts = lines[i].split(',').map(p => p.replace(/^["']|["']$/g, ''));
      parsedPreview.push({
        name: parts[0] || '',
        slug: parts[1] || '',
        parent_slug: parts[2] || '',
        description: parts[3] || '',
      });
    }
    setImportPreview(parsedPreview);
  };

  const handleCsvImportSubmit = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportErrors([]);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      await apiClient('/api/admin/categories/import', {
        method: 'POST',
        body: formData,
      });
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      handleCategoriesUpdate();
      showSwalAlert(tc('success') || 'Success', tCat('importSuccess') || 'Categories imported successfully', 'success');
    } catch (err: any) {
      // Backend returns validation error array in details if present
      if (err.message.includes('validation failed') || err.message.includes('CSV')) {
        // Try to parse error list
        try {
          // Since apiClient throws raw error message, if it is a JSON error we can parse it
          // Wait, apiClient throws `Error(errorData?.error?.message)` - so we might not have the full object.
          // Let's modify apiClient or catch it. Since apiClient in admin throws errorData?.error?.message, 
          // let's check if we can query details from database or if the error message is clean.
          setImportErrors([{ error: err.message }]);
        } catch {
          setImportErrors([{ error: err.message }]);
        }
      } else {
        setImportErrors([{ error: err.message || tCat('failedImport') }]);
      }
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter Categories by search query
  const filteredCategories = categories;

  // Expand parents if search query is active
  const isSearching = search.trim().length > 0;

  // Determine if a category should be visible based on collapsed parents
  const isVisible = (category: Category) => {
    if (isSearching) return true;
    let currentParentId = category.parent_id;
    while (currentParentId) {
      if (collapsed[currentParentId]) {
        return false;
      }
      const parent = allCategories.find((c) => c.id === currentParentId);
      currentParentId = parent ? parent.parent_id : null;
    }
    return true;
  };

  // Get children count
  const getChildrenCount = (id: string) => {
    return allCategories.filter((c) => c.parent_id === id).length;
  };

  // Candidates for parent selection: prevent circular dependency by excluding editing category and its descendants!
  const getParentOptions = () => {
    if (!editingCategory) return allCategories;
    return allCategories.filter(
      (c) => c.id !== editingCategory.id && !c.path.startsWith(editingCategory.path)
    );
  };

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
      {/* Sticky Header wrapper */}
      <div className="sticky top-16 z-30 bg-slate-950/90 -mx-6 px-6 py-5 md:-mx-8 md:px-8 -mt-6 lg:-mt-8 border-b border-slate-900 backdrop-blur-md flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{tCat('title')}</h1>
            <p className="mt-2 text-slate-400 text-xs sm:text-sm">
              {tCat('subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <Upload className="h-4 w-4" />
              <span>{tCat('importCsv')}</span>
            </button>

            <button
              onClick={() => openCreateModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 hover:brightness-110 active:scale-[0.98] transition"
            >
              <Plus className="h-4 w-4" />
              <span>{tCat('addRoot')}</span>
            </button>
          </div>
        </div>

        {/* Filter and search bar */}
        <div className="flex max-w-md items-center gap-2 rounded-xl border border-slate-900 bg-slate-900/30 px-3.5 py-2.5 backdrop-blur-xl">
          <Search className="h-5 w-5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder={tCat('searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 text-sm flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Categories Tree */}
      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : categories.length > 0 ? (
        <>
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl overflow-hidden w-full min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/20">
                  <th className="py-4 px-6">{tCat('name')}</th>
                  <th className="py-4 px-6">{tCat('slug')}</th>
                  <th className="py-4 px-6">{tCat('descriptionLabel')}</th>
                  <th className="py-4 px-6 text-center">{tCat('nesting')}</th>
                  <th className="py-4 px-6 text-right">{tc('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {filteredCategories
                  .filter(isVisible)
                  .map((category) => {
                    const childrenCount = getChildrenCount(category.id);
                    const isCollapsed = collapsed[category.id];
                    const siblings = allCategories.filter((c) => c.parent_id === category.parent_id);
                    const siblingIdx = siblings.findIndex((c) => c.id === category.id);
                    const canMoveUp = siblingIdx > 0;
                    const canMoveDown = siblingIdx < siblings.length - 1;

                    return (
                      <tr key={category.id} className="hover:bg-slate-900/20 transition">
                        <td className="py-4 px-6 font-medium text-white flex items-center">
                          {/* Indentation Spacing */}
                          <div 
                            className="flex shrink-0" 
                            style={{ width: `${category.depth * 24}px` }} 
                          />

                          {/* Tree Lines/Lines connector decoration */}
                          {category.depth > 0 && (
                            <div className="w-4 h-6 border-l-2 border-b-2 border-slate-800 -mt-3 mr-2 rounded-bl-lg shrink-0" />
                          )}

                          {/* Expand/Collapse Trigger */}
                          {childrenCount > 0 && !isSearching ? (
                            <button
                              onClick={() => toggleCollapse(category.id)}
                              className="mr-2 p-1 text-slate-500 hover:text-white rounded hover:bg-slate-850 shrink-0"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <div className="w-6 shrink-0" />
                          )}

                          <FolderTree className="h-4 w-4 text-blue-400 mr-2 shrink-0" />
                          <span className="font-bold text-slate-100">{category.name}</span>

                          {category.is_system && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                              <Lock className="h-2.5 w-2.5" />
                              {tCat('systemLabel')}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-mono text-xs">{category.slug}</td>
                        <td className="py-4 px-6 text-slate-400 max-w-xs truncate">{category.description || '-'}</td>
                        <td className="py-4 px-6 text-center text-xs font-semibold text-slate-500">
                          {tCat('depth', { depth: category.depth })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Reordering */}
                            {!category.is_system && (
                              <>
                                <button
                                  onClick={() => handleReorder(category, 'up')}
                                  disabled={!canMoveUp}
                                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                                  title={tCat('moveUp')}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReorder(category, 'down')}
                                  disabled={!canMoveDown}
                                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
                                  title={tCat('moveDown')}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}

                            {/* Add Child Category */}
                            {category.depth < 10 && (
                              <button
                                onClick={() => openCreateModal(category.id)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                                title={tCat('addSub')}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => openEditModal(category)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                              title={tCat('editTitle')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            {!category.is_system ? (
                              <button
                                onClick={() => handleDelete(category)}
                                className="p-1.5 text-rose-500/80 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                                title={tCat('deleteCategory')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <div className="w-7 h-7" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination UI */}
        {totalCategories > 0 && (
          <div className="sticky bottom-16 lg:bottom-0 z-30 bg-slate-950/90 -mx-6 px-6 py-4 md:-mx-8 md:px-8 border-t border-slate-900 backdrop-blur-md mt-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div>
              {tc('showingRange', { start: (currentPage - 1) * itemsPerPage + 1, end: Math.min(currentPage * itemsPerPage, totalCategories), total: totalCategories })}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  {tc('previous')}
                </button>
                
                {renderPageNumbers()}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2 font-semibold text-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  {tc('next')}
                </button>
              </div>
            )}
          </div>
        )}
      </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500 bg-slate-900/5 backdrop-blur-xl">
          <FolderTree className="mx-auto mb-4 h-12 w-12 opacity-30 text-blue-400" />
          <h3 className="font-bold text-lg text-white">{tCat('noCategories')}</h3>
          <p className="mt-1 text-sm">{tCat('noCategoriesSub')}</p>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingCategory ? tCat('editTitle') : tCat('createTitle')}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tCat('nameLabel')}</label>
                <input
                  type="text"
                  placeholder="e.g. Matematika"
                  {...register('name')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errors.name && <p className="text-xs text-rose-400">{tCat(errors.name.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tCat('parentLabel')}</label>
                <select
                  {...register('parent_id')}
                  disabled={editingCategory?.is_system}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 disabled:opacity-50"
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue('parent_id', val === '' ? null : val);
                  }}
                  value={watchParentId || ''}
                >
                  <option value="">{tCat('noneRoot')}</option>
                  {getParentOptions()
                    .filter((c) => !c.is_system) // Do not allow system categories as parents
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {'\u00A0'.repeat(c.depth * 3)} {c.depth > 0 ? '↳ ' : ''}{c.name}
                      </option>
                    ))}
                </select>
                {errors.parent_id && <p className="text-xs text-rose-400">{tCat(errors.parent_id.message || '')}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{tCat('descriptionLabel')}</label>
                <textarea
                  placeholder={tCat('descriptionPlaceholder')}
                  rows={3}
                  {...register('description')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
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
                  {isSubmitLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  )}
                  <span>{tc('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div 
          onClick={() => {
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportPreview([]);
            setImportErrors([]);
          }}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                <span>{tCat('importTitle')}</span>
              </h2>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportErrors([]);
                }} 
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{tCat('uploadHint')}</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/categories/import/template`}
                  download="categories_template.csv"
                  className="flex items-center gap-1.5 text-blue-400 hover:underline font-semibold"
                >
                  <Download className="h-3 w-3" />
                  {tCat('downloadTemplate')}
                </a>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={triggerCsvSelect}
                className="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center hover:border-blue-500/50 hover:bg-slate-950/20 cursor-pointer transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleCsvSelect}
                  className="hidden"
                />
                <Upload className="mx-auto h-10 w-10 text-slate-500 mb-3" />
                <p className="text-sm font-semibold text-slate-200">
                  {importFile ? importFile.name : tCat('clickUpload')}
                </p>
                <p className="text-xs text-slate-550 mt-1">{tCat('acceptCsvHint')}</p>
              </div>

              {/* Preview */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-450 tracking-wider">{tc('showingRange', { start: 1, end: Math.min(importPreview.length, 5), total: importPreview.length })}</p>
                  <div className="rounded-xl border border-slate-850 overflow-hidden bg-slate-950/40 text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400">
                          <th className="p-2.5">{tCat('name')}</th>
                          <th className="p-2.5">{tCat('slug')}</th>
                          <th className="p-2.5">{tCat('parentSlug')}</th>
                          <th className="p-2.5">{tCat('descriptionLabel')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="text-slate-300">
                            <td className="p-2.5 font-medium">{row.name}</td>
                            <td className="p-2.5 font-mono">{row.slug}</td>
                            <td className="p-2.5 font-mono">{row.parent_slug || '-'}</td>
                            <td className="p-2.5 truncate max-w-[120px]">{row.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors report */}
              {importErrors.length > 0 && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {tCat('importErrors') || 'Import Errors Found:'}
                  </p>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>
                        {err.rowNum ? `Row ${err.rowNum}: ` : ''}{err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportErrors([]);
                }}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleCsvImportSubmit}
                disabled={isImporting || !importFile}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {isImporting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                )}
                <span>{tCat('importButton')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
