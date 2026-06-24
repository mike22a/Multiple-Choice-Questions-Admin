'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useRouter, Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  Eye, 
  FileDown, 
  ToggleLeft, 
  ToggleRight, 
  ShieldAlert, 
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  X,
  Check,
  Settings2
} from 'lucide-react';
import { format } from 'date-fns';

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, 'Duration must be at least 1 minute'),
  max_attempts: z.coerce.number().min(1, 'Max attempts must be at least 1'),
  pass_score: z.coerce.number().min(1).max(100, 'Pass score must be between 1 and 100'),
  randomize_questions: z.boolean().default(false),
  randomize_options: z.boolean().default(false),
  show_result_immediately: z.boolean().default(true),
  safe_mode: z.boolean().default(false),
  available_from: z.string().optional().nullable(),
  available_until: z.string().optional().nullable(),
  timezone: z.string().default('Asia/Jakarta'),
});

type QuizFormValues = z.infer<typeof quizSchema>;

interface Quiz {
  id: string;
  title: string;
  description: string;
  slug: string;
  duration_minutes: number;
  max_attempts: number;
  pass_score: number;
  is_published: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_result_immediately: boolean;
  safe_mode: boolean;
  available_from: string | null;
  available_until: string | null;
  timezone: string;
  created_at: string;
}

export default function QuizzesPage() {
  const router = useRouter();
  const tc = useTranslations('Common');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
  });

  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/admin/quizzes');
      const data = res?.data || res;
      setQuizzes(data?.quizzes || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const openCreateModal = () => {
    setEditingQuiz(null);
    reset({
      title: '',
      description: '',
      duration_minutes: 30,
      max_attempts: 1,
      pass_score: 70,
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: true,
      safe_mode: false,
      available_from: '',
      available_until: '',
      timezone: 'Asia/Jakarta',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    reset({
      title: quiz.title,
      description: quiz.description || '',
      duration_minutes: quiz.duration_minutes,
      max_attempts: quiz.max_attempts,
      pass_score: quiz.pass_score,
      randomize_questions: quiz.randomize_questions,
      randomize_options: quiz.randomize_options,
      show_result_immediately: quiz.show_result_immediately,
      safe_mode: quiz.safe_mode,
      available_from: quiz.available_from ? quiz.available_from.substring(0, 16) : '',
      available_until: quiz.available_until ? quiz.available_until.substring(0, 16) : '',
      timezone: quiz.timezone || 'Asia/Jakarta',
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: QuizFormValues) => {
    setIsSubmitLoading(true);
    try {
      const payload = {
        ...data,
        available_from: data.available_from ? new Date(data.available_from).toISOString() : null,
        available_until: data.available_until ? new Date(data.available_until).toISOString() : null,
      };

      if (editingQuiz) {
        // Edit Quiz
        await apiClient(`/api/admin/quizzes/${editingQuiz.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create Quiz
        await apiClient('/api/admin/quizzes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      loadQuizzes();
    } catch (err: any) {
      alert(err?.message || 'Failed to save quiz');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await apiClient(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
      loadQuizzes();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete quiz');
    }
  };

  const togglePublish = async (quiz: Quiz) => {
    try {
      const res = await apiClient(`/api/admin/quizzes/${quiz.id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: !quiz.is_published }),
      });
      const data = res?.data || res;
      // update state locally
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, is_published: data.is_published } : q));
    } catch (err: any) {
      alert(err?.message || 'Failed to update publication status');
    }
  };

  const toggleSafeMode = async (quiz: Quiz) => {
    try {
      const res = await apiClient(`/api/admin/quizzes/${quiz.id}/safe-mode`, {
        method: 'PATCH',
        body: JSON.stringify({ safe_mode: !quiz.safe_mode }),
      });
      const data = res?.data || res;
      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, safe_mode: data.safe_mode } : q));
    } catch (err: any) {
      alert(err?.message || 'Failed to update safe mode status');
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.description && q.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Quiz Management</h1>
          <p className="mt-2 text-slate-400">Configure exams, questions, and view candidate enrollment parameters.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 hover:brightness-110 active:scale-[0.98] transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Quiz</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="flex max-w-md items-center gap-2 rounded-xl border border-slate-900 bg-slate-900/30 px-3.5 py-2.5 backdrop-blur-xl">
        <Search className="h-5 w-5 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Search quizzes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
        />
      </div>

      {/* Quiz List Grid */}
      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : filteredQuizzes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <div 
              key={quiz.id} 
              className="group flex flex-col justify-between rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl transition hover:border-slate-800"
            >
              <div>
                {/* Title & Status Badges */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition">{quiz.title}</h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${quiz.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {quiz.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400 line-clamp-2 h-8">{quiz.description || 'No description provided.'}</p>

                {/* Details list */}
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-2 border-t border-slate-900/60 pt-4 text-xs">
                  <div>
                    <span className="text-slate-500">Duration:</span>
                    <span className="ml-1.5 font-semibold text-slate-300">{quiz.duration_minutes} mins</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Pass Score:</span>
                    <span className="ml-1.5 font-semibold text-slate-300">{quiz.pass_score}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Max Attempts:</span>
                    <span className="ml-1.5 font-semibold text-slate-300">{quiz.max_attempts}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Proctoring:</span>
                    <span className={`ml-1.5 font-semibold inline-flex items-center gap-1 ${quiz.safe_mode ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {quiz.safe_mode ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                      <span>{quiz.safe_mode ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </div>
                </div>

                {/* Dates info */}
                {(quiz.available_from || quiz.available_until) && (
                  <div className="mt-4 rounded-lg bg-slate-950/40 p-2.5 text-[10px] text-slate-500 border border-slate-900/40">
                    <p>Available: {quiz.available_from ? format(new Date(quiz.available_from), 'dd MMM yyyy HH:mm') : 'Anytime'} to {quiz.available_until ? format(new Date(quiz.available_until), 'dd MMM yyyy HH:mm') : 'Indefinite'}</p>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-900/60 pt-4">
                <Link
                  href={`/quizzes/${quiz.id}/questions`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/10 border border-blue-500/25 px-3.5 py-2 text-xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white hover:border-transparent transition"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Manage Questions</span>
                </Link>

                <div className="flex items-center gap-2">
                  {/* Toggle publish button */}
                  <button
                    onClick={() => togglePublish(quiz)}
                    title={quiz.is_published ? 'Unpublish' : 'Publish'}
                    className={`rounded-lg p-2 transition ${quiz.is_published ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-900'}`}
                  >
                    {quiz.is_published ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>

                  {/* Toggle safe mode button */}
                  <button
                    onClick={() => toggleSafeMode(quiz)}
                    title="Toggle proctoring safe mode"
                    className={`rounded-lg p-2 transition ${quiz.safe_mode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-slate-500 hover:bg-slate-900'}`}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>

                  {/* Export CSV link */}
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/quizzes/${quiz.id}/export`}
                    title="Export questions CSV"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                  >
                    <FileDown className="h-4 w-4" />
                  </a>

                  {/* Edit button */}
                  <button
                    onClick={() => openEditModal(quiz)}
                    title="Edit metadata"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    title="Delete Quiz"
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">No quizzes found</h3>
          <p className="mt-1 text-sm">Create a new quiz configurations to get started.</p>
        </div>
      )}

      {/* Create / Edit Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-[95%] max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingQuiz ? 'Edit Quiz Config' : 'Create New Quiz'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions Manager Shortcut Callout (Only in edit mode) */}
            {editingQuiz && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-white">Manage Quiz Questions</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Add, edit, or delete questions and answer options for this quiz.</p>
                  </div>
                </div>
                <Link
                  href={`/quizzes/${editingQuiz.id}/questions`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition shrink-0"
                >
                  <span>Go to Questions Manager</span>
                </Link>
              </div>
            )}

            {/* Modal form body */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Title & Timezone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Quiz Title</label>
                  <input
                    type="text"
                    {...register('title')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errors.title && <p className="text-xs text-rose-400">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Timezone</label>
                  <input
                    type="text"
                    {...register('timezone')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Description</label>
                <textarea
                  rows={3}
                  {...register('description')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Stats: Duration, Max Attempts, Pass Score */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Duration (Minutes)</label>
                  <input
                    type="number"
                    {...register('duration_minutes')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errors.duration_minutes && <p className="text-xs text-rose-400">{errors.duration_minutes.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Max Attempts</label>
                  <input
                    type="number"
                    {...register('max_attempts')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errors.max_attempts && <p className="text-xs text-rose-400">{errors.max_attempts.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Pass Score (%)</label>
                  <input
                    type="number"
                    {...register('pass_score')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errors.pass_score && <p className="text-xs text-rose-400">{errors.pass_score.message}</p>}
                </div>
              </div>

              {/* Availability: Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Available From</label>
                  <input
                    type="datetime-local"
                    {...register('available_from')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Available Until</label>
                  <input
                    type="datetime-local"
                    {...register('available_until')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Boolean Toggles Grid */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('randomize_questions')}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-sm text-slate-300">Randomize Question Order</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('randomize_options')}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-sm text-slate-300">Randomize Answer Options</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('show_result_immediately')}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-sm text-slate-300">Show Score Review Immediately</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('safe_mode')}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-sm text-indigo-400 font-semibold">Enable Proctoring Safe Mode</span>
                </label>
              </div>

              {/* Modal action footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <span>{tc('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
