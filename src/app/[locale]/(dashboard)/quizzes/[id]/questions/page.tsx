'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useRouter, Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import CodeBlock from '@/components/CodeBlock';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { 
  ArrowLeft,
  Plus, 
  Edit, 
  Trash, 
  HelpCircle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckSquare,
  Circle,
  Sparkles,
  AlertCircle,
  Sliders,
  BookOpen,
  Link2,
  Unlink
} from 'lucide-react';

const questionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['single', 'multiple', 'weighted']),
  points: z.coerce.number().min(0, 'Points must be at least 0'),
  explanation: z.string().optional().nullable(),
  order_num: z.coerce.number().min(1),
  code_language: z.string().optional().nullable(),
  code_content: z.string().optional().nullable(),
  passage_id: z.string().uuid().optional().nullable(),
});

const passageSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1, 'Passage body is required'),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

const optionSchema = z.object({
  option_text: z.string().min(1, 'Option text is required'),
  is_correct: z.boolean().default(false),
  points: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().int().min(0, 'Points must be at least 0')
  ).default(0),
});

type OptionFormValues = z.infer<typeof optionSchema>;

interface AnswerOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  points: number;
  order_num: number;
}

interface QuestionImage {
  id: string;
  public_url: string;
  alt_text: string;
  order_num: number;
}

interface Passage {
  id: string;
  title: string | null;
  body: string;
  order_num: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'weighted';
  points: number;
  explanation: string | null;
  order_num: number;
  code_language?: string | null;
  code_content?: string | null;
  passage_id?: string | null;
  passage?: Passage | null;
  options?: AnswerOption[];
  images?: QuestionImage[];
}

export default function QuestionsPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  const router = useRouter();
  const t = useTranslations('Questions');
  const tc = useTranslations('Common');

  const [quizTitle, setQuizTitle] = useState('Quiz Questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passage modal states
  const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
  const [passageForm, setPassageForm] = useState({ title: '', body: '' });
  const [passageFormError, setPassageFormError] = useState<string | null>(null);
  const [isPassageSubmitLoading, setIsPassageSubmitLoading] = useState(false);
  // Track which passage_id is selected in the question form
  const [selectedPassageId, setSelectedPassageId] = useState<string | null | undefined>(undefined);

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

  const showSwalConfirm = (title: string, text: string, confirmButtonText = tc('delete')) => {
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
      cancelButtonText: tc('cancel'),
      customClass: {
        popup: 'border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md',
        title: 'text-lg font-bold text-white',
        htmlContainer: 'text-sm text-slate-400',
        confirmButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold',
        cancelButton: 'rounded-xl px-5 py-2.5 text-sm font-semibold'
      }
    });
  };

  // Expanded questions map
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Question Modal states
  const [isQModalOpen, setIsQModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isQSubmitLoading, setIsQSubmitLoading] = useState(false);

  // Option Modal/Inline states
  const [isOptModalOpen, setIsOptModalOpen] = useState(false);
  const [targetQuestionId, setTargetQuestionId] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<AnswerOption | null>(null);
  const [isOptSubmitLoading, setIsOptSubmitLoading] = useState(false);

  // Image Upload states
  const [isUploadingImage, setIsUploadingImage] = useState<string | null>(null); // maps to questionId

  // Inline points editing states
  const [editingPointsQId, setEditingPointsQId] = useState<string | null>(null);
  const [tempPointsValue, setTempPointsValue] = useState<string>('');
  const [inlineLoadingQId, setInlineLoadingQId] = useState<string | null>(null);

  // Bulk points states
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkType, setBulkType] = useState<'equal' | 'distribute'>('equal');
  const [bulkPointsValue, setBulkPointsValue] = useState<number>(5);
  const [bulkTotalPointsValue, setBulkTotalPointsValue] = useState<number>(100);
  const [isBulkSubmitLoading, setIsBulkSubmitLoading] = useState(false);

  // Option toggle loading state
  const [loadingOptionId, setLoadingOptionId] = useState<string | null>(null);

  const targetQuestion = questions.find(q => q.id === targetQuestionId);
  const isWeighted = targetQuestion?.question_type === 'weighted';

  const {
    register: registerQ,
    handleSubmit: handleSubmitQ,
    reset: resetQ,
    watch: watchQ,
    formState: { errors: errorsQ },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
  });

  const watchLanguage = watchQ('code_language');
  const watchCodeContent = watchQ('code_content');

  const {
    register: registerOpt,
    handleSubmit: handleSubmitOpt,
    reset: resetOpt,
    setValue: setValueOpt,
    formState: { errors: errorsOpt },
  } = useForm<OptionFormValues>({
    resolver: zodResolver(optionSchema),
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch quiz details first
      const quizRes = await apiClient(`/api/admin/quizzes`);
      const quiz = quizRes?.data || quizRes;
      const quizzesData = quiz?.quizzes || quiz || [];
      const targetQuiz = quizzesData.find((q: any) => q.id === quizId);
      if (targetQuiz) {
        setQuizTitle(targetQuiz.title);
      }

      // Fetch questions and passages in parallel
      const [dataRes, passagesRes] = await Promise.all([
        apiClient(`/api/admin/quizzes/${quizId}/questions`),
        apiClient(`/api/admin/quizzes/${quizId}/passages`),
      ]);
      const data = dataRes?.data || dataRes || [];
      const passagesData = passagesRes?.data || passagesRes || [];
      setQuestions(data);
      setPassages(passagesData);
      
      // Auto expand the first question if exists
      if (data && data.length > 0) {
        setExpandedQuestions(prev => ({ ...prev, [data[0].id]: true }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load questions data');
    } finally {
      setIsLoading(false);
    }
  };

  // --- PASSAGE ACTIONS ---
  const handleCreatePassage = async () => {
    const parsed = passageSchema.safeParse(passageForm);
    if (!parsed.success) {
      setPassageFormError(parsed.error.errors[0]?.message || 'Validation error');
      return;
    }
    setIsPassageSubmitLoading(true);
    setPassageFormError(null);
    try {
      await apiClient(`/api/admin/quizzes/${quizId}/passages`, {
        method: 'POST',
        body: JSON.stringify({ title: passageForm.title || null, body: passageForm.body }),
      });
      setPassageForm({ title: '', body: '' });
      setIsPassageModalOpen(false);
      loadData();
      showSwalAlert('Berhasil', 'Passage berhasil dibuat', 'success');
    } catch (err: any) {
      setPassageFormError(err?.message || 'Gagal membuat passage');
    } finally {
      setIsPassageSubmitLoading(false);
    }
  };

  const handleDeletePassage = async (passageId: string) => {
    const result = await showSwalConfirm(
      'Hapus Passage?',
      'Soal-soal yang terhubung akan menjadi soal mandiri (tidak terhapus).'
    );
    if (!result.isConfirmed) return;
    try {
      await apiClient(`/api/admin/passages/${passageId}`, { method: 'DELETE' });
      loadData();
      showSwalAlert('Berhasil', 'Passage dihapus. Soal terhubung kini berdiri sendiri.', 'success');
    } catch (err: any) {
      showSwalAlert('Error', err?.message || 'Gagal menghapus passage', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [quizId]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // --- QUESTION ACTIONS ---
  const openCreateQModal = () => {
    setEditingQuestion(null);
    setSelectedPassageId(null);
    resetQ({
      question_text: '',
      question_type: 'single',
      points: 10,
      explanation: '',
      order_num: questions.length + 1,
      code_language: '',
      code_content: '',
      passage_id: null,
    });
    setIsQModalOpen(true);
  };

  const openEditQModal = (q: Question) => {
    setEditingQuestion(q);
    setSelectedPassageId(q.passage_id ?? null);
    resetQ({
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      explanation: q.explanation || '',
      order_num: q.order_num,
      code_language: q.code_language || '',
      code_content: q.code_content || '',
      passage_id: q.passage_id ?? null,
    });
    setIsQModalOpen(true);
  };

  const onSubmitQ = async (data: QuestionFormValues) => {
    setIsQSubmitLoading(true);
    try {
      const payload = { ...data, passage_id: selectedPassageId ?? null };
      if (editingQuestion) {
        await apiClient(`/api/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient(`/api/admin/quizzes/${quizId}/questions`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsQModalOpen(false);
      loadData();
      showSwalAlert(tc('success'), t('questionSaved') || 'Question saved successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || t('failedSaveQuestion'), 'error');
    } finally {
      setIsQSubmitLoading(false);
    }
  };

  const handleDeleteQ = async (qId: string) => {
    const result = await showSwalConfirm(t('deleteQuestionConfirm') || tc('confirmDelete'), '');
    if (!result.isConfirmed) return;
    try {
      await apiClient(`/api/admin/questions/${qId}`, { method: 'DELETE' });
      loadData();
      showSwalAlert(tc('success'), t('questionDeleted') || 'Question deleted successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || t('failedDeleteQuestion'), 'error');
    }
  };

  // --- OPTION ACTIONS ---
  const openCreateOptModal = (qId: string) => {
    setTargetQuestionId(qId);
    setEditingOption(null);
    resetOpt({
      option_text: '',
      is_correct: false,
      points: 0,
    });
    setIsOptModalOpen(true);
  };

  const openEditOptModal = (qId: string, opt: AnswerOption) => {
    setTargetQuestionId(qId);
    setEditingOption(opt);
    resetOpt({
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      points: opt.points || 0,
    });
    setIsOptModalOpen(true);
  };

  const onSubmitOpt = async (data: OptionFormValues) => {
    if (!targetQuestionId) return;
    setIsOptSubmitLoading(true);
    const targetQuestion = questions.find(q => q.id === targetQuestionId);
    const isWeighted = targetQuestion?.question_type === 'weighted';
    const payload: any = {
      option_text: data.option_text,
      is_correct: isWeighted ? (data.points || 0) > 0 : data.is_correct,
    };
    if (isWeighted) {
      payload.points = data.points || 0;
    }
    try {
      if (editingOption) {
        await apiClient(`/api/admin/options/${editingOption.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiClient(`/api/admin/questions/${targetQuestionId}/options`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setIsOptModalOpen(false);
      loadData();
      showSwalAlert(tc('success'), t('optionSaved') || 'Option saved successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || t('failedSaveOption'), 'error');
    } finally {
      setIsOptSubmitLoading(false);
    }
  };

  const handleDeleteOpt = async (optId: string) => {
    const result = await showSwalConfirm(t('deleteOptionConfirm') || tc('confirmDelete'), '');
    if (!result.isConfirmed) return;
    try {
      await apiClient(`/api/admin/options/${optId}`, { method: 'DELETE' });
      loadData();
      showSwalAlert(tc('success'), t('optionDeleted') || 'Option deleted successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || t('failedDeleteOption'), 'error');
    }
  };

  // --- IMAGE UPLOAD ACTIONS ---
  const handleImageUpload = async (qId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(qId);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('alt_text', 'Question Image');

    try {
      // In production we hit /api/admin/questions/:id/images, let's post as multipart formData
      await apiClient(`/api/admin/questions/${qId}/images`, {
        method: 'POST',
        body: formData,
      });
      loadData();
      showSwalAlert(tc('success'), 'Image uploaded successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || 'Failed to upload image. Please check API connection.', 'error');
    } finally {
      setIsUploadingImage(null);
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    const result = await showSwalConfirm('Are you sure you want to delete this image?', '');
    if (!result.isConfirmed) return;
    try {
      await apiClient(`/api/admin/images/${imgId}`, { method: 'DELETE' });
      loadData();
      showSwalAlert(tc('success'), 'Image deleted successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || 'Failed to delete image', 'error');
    }
  };

  const handleSetOptionCorrectSingle = async (questionId: string, optionId: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q || !q.options) return;

    setLoadingOptionId(optionId);
    try {
      const currentCorrectOpt = q.options.find((opt) => opt.is_correct);

      await apiClient(`/api/admin/options/${optionId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_correct: true }),
      });

      if (currentCorrectOpt && currentCorrectOpt.id !== optionId) {
        await apiClient(`/api/admin/options/${currentCorrectOpt.id}`, {
          method: 'PUT',
          body: JSON.stringify({ is_correct: false }),
        });
      }

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? {
                ...item,
                options: item.options?.map((o) => ({
                  ...o,
                  is_correct: o.id === optionId,
                })),
              }
            : item
        )
      );
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || 'Failed to update correct option', 'error');
    } finally {
      setLoadingOptionId(null);
    }
  };

  const handleToggleOptionCorrectMultiple = async (questionId: string, optionId: string) => {
    const q = questions.find((item) => item.id === questionId);
    if (!q || !q.options) return;

    const opt = q.options.find((o) => o.id === optionId);
    if (!opt) return;

    const nextCorrect = !opt.is_correct;
    setLoadingOptionId(optionId);

    try {
      await apiClient(`/api/admin/options/${optionId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_correct: nextCorrect }),
      });

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? {
                ...item,
                options: item.options?.map((o) =>
                  o.id === optionId ? { ...o, is_correct: nextCorrect } : o
                ),
              }
            : item
        )
      );
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || 'Failed to toggle option correctness', 'error');
    } finally {
      setLoadingOptionId(null);
    }
  };

  const handleSavePointsInline = async (qId: string) => {
    const pointsNum = parseInt(tempPointsValue, 10);
    if (isNaN(pointsNum) || pointsNum < 1) {
      showSwalAlert(tc('warning'), 'Points must be a valid integer greater than or equal to 1', 'warning');
      return;
    }

    setInlineLoadingQId(qId);
    try {
      const q = questions.find((item) => item.id === qId);
      if (!q) return;

      await apiClient(`/api/admin/questions/${qId}`, {
        method: 'PUT',
        body: JSON.stringify({
          points: pointsNum,
        }),
      });

      setQuestions((prev) =>
        prev.map((item) => (item.id === qId ? { ...item, points: pointsNum } : item))
      );
      setEditingPointsQId(null);
      showSwalAlert(tc('success'), 'Points updated successfully', 'success');
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || 'Failed to update points', 'error');
    } finally {
      setInlineLoadingQId(null);
    }
  };

  const handleApplyBulkPoints = async () => {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return;

    if (bulkType === 'distribute' && bulkTotalPointsValue < totalQuestions) {
      showSwalAlert(tc('warning'), t('distributeErrorLess', { count: totalQuestions }), 'warning');
      return;
    }

    setIsBulkSubmitLoading(true);
    try {
      await apiClient(`/api/admin/quizzes/${quizId}/questions/bulk-points`, {
        method: 'PUT',
        body: JSON.stringify(
          bulkType === 'equal'
            ? { type: 'equal', points: bulkPointsValue }
            : { type: 'distribute', total_points: bulkTotalPointsValue }
        ),
      });

      showSwalAlert(tc('success'), t('pointsApplied') || 'Points applied successfully', 'success');
      setIsBulkModalOpen(false);
      loadData();
    } catch (err: any) {
      showSwalAlert(tc('error'), err?.message || t('failedApplyPoints'), 'error');
    } finally {
      setIsBulkSubmitLoading(false);
    }
  };

  const getDistributePreview = () => {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return '';
    if (bulkTotalPointsValue < totalQuestions) {
      return t('distributeErrorLess', { count: totalQuestions });
    }
    const basePoints = Math.floor(bulkTotalPointsValue / totalQuestions);
    const remainder = bulkTotalPointsValue % totalQuestions;

    if (remainder === 0) {
      return t('distributePreviewEven', {
        count: totalQuestions,
        points: basePoints,
        total: bulkTotalPointsValue,
      });
    } else {
      return t('distributePreview', {
        remainder,
        high: basePoints + 1,
        rest: totalQuestions - remainder,
        low: basePoints,
        total: bulkTotalPointsValue,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Sticky Header wrapper */}
      <div className="sticky top-16 z-30 bg-slate-950/90 -mx-6 px-6 py-5 md:-mx-8 md:px-8 -mt-6 lg:-mt-8 border-b border-slate-900 backdrop-blur-md flex flex-col gap-4">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center gap-3">
          <Link
            href="/quizzes"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('title')}</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{quizTitle}</h1>
          </div>
        </div>

        {/* Control bar */}
        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-sm">{t('totalQuestions', { count: questions.length })}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPassageForm({ title: '', body: '' });
                setPassageFormError(null);
                setIsPassageModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <BookOpen className="h-4 w-4" />
              <span>Kelola Passage ({passages.length})</span>
            </button>
            {questions.length > 0 && (
              <button
                onClick={() => {
                  setBulkType('equal');
                  setBulkPointsValue(5);
                  setBulkTotalPointsValue(100);
                  setIsBulkModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <Sliders className="h-4 w-4" />
                <span>{t('managePoints')}</span>
              </button>
            )}
            <button
              onClick={openCreateQModal}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition"
            >
              <Plus className="h-4 w-4" />
              <span>{t('addQuestion')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 text-sm flex gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Question Cards Accordion List */}
      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-4 w-full min-w-0">
          {questions
            .sort((a, b) => a.order_num - b.order_num)
            .map((q, index) => {
              const isExpanded = !!expandedQuestions[q.id];
              return (
                <div 
                  key={q.id} 
                  className={`rounded-2xl border transition-all ${isExpanded ? 'border-slate-800 bg-slate-900/20' : 'border-slate-900 bg-slate-900/10 hover:border-slate-800'}`}
                >
                  {/* Header Row (Always visible) */}
                  <div 
                    onClick={() => toggleExpand(q.id)}
                    className="flex items-center justify-between p-6 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 font-bold text-xs text-slate-400">
                        {q.order_num}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white text-sm md:text-base pr-4 line-clamp-1">{q.question_text}</h3>
                          {q.passage && (
                            <span className="flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-400 shrink-0">
                              <BookOpen className="h-3 w-3" />
                              {q.passage.title || 'Passage'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500" onClick={(e) => e.stopPropagation()}>
                          <span className="capitalize">
                            {q.question_type === 'weighted' ? t('weightedChoice') : (q.question_type === 'multiple' ? t('multipleChoice') : t('singleChoice'))}
                          </span>
                          <span>•</span>
                          {editingPointsQId === q.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-0.5 text-center text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                                value={tempPointsValue}
                                onChange={(e) => setTempPointsValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePointsInline(q.id);
                                  if (e.key === 'Escape') setEditingPointsQId(null);
                                }}
                                autoFocus
                              />
                              {inlineLoadingQId === q.id ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border border-blue-500/20 border-t-blue-500" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleSavePointsInline(q.id)}
                                    className="rounded p-0.5 text-green-400 hover:bg-slate-800 transition"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPointsQId(null)}
                                    className="rounded p-0.5 text-rose-400 hover:bg-slate-800 transition"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span 
                              onClick={() => {
                                setEditingPointsQId(q.id);
                                setTempPointsValue(q.points.toString());
                              }}
                              className="cursor-pointer border-b border-dashed border-slate-500 hover:text-white hover:border-white transition font-medium"
                              title="Click to edit points inline"
                            >
                              {q.points} {t('points').toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditQModal(q)}
                        title={t('editQuestion')}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQ(q.id)}
                        title={t('deleteQuestionConfirm')}
                        className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => toggleExpand(q.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body Panel */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-slate-900/60 pt-6 space-y-6">
                      {/* Code Block */}
                      {q.code_language && q.code_content && (
                        <CodeBlock language={q.code_language} code={q.code_content} />
                      )}

                      {/* Question Images */}
                      {q.images && q.images.length > 0 && (
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                          {q.images.map((img) => (
                            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                              <img src={img.public_url} alt={img.alt_text} className="w-full h-32 object-cover" />
                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                className="absolute top-2 right-2 rounded-lg bg-slate-950/80 p-1.5 text-rose-400 opacity-0 group-hover:opacity-100 transition hover:bg-slate-950"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Image Upload Trigger */}
                      <div className="flex items-center gap-3">
                        <label className="relative flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-400 hover:border-slate-700 hover:text-slate-200 transition">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(q.id, e)}
                            className="hidden"
                            disabled={isUploadingImage === q.id}
                          />
                          <ImageIcon className="h-4 w-4" />
                          <span>{isUploadingImage === q.id ? tc('loading') : t('uploadImage')}</span>
                        </label>
                      </div>

                      {/* Answer Options Header */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-900/60 pb-2">
                          <h4 className="font-bold text-slate-300 text-sm">{t('answerOptions')}</h4>
                          <button
                            onClick={() => openCreateOptModal(q.id)}
                            className="flex items-center gap-1 text-xs text-blue-400 font-semibold hover:text-blue-300 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>{t('addOption')}</span>
                          </button>
                        </div>

                        {/* Options List */}
                        <div className="space-y-2">
                          {q.options && q.options.length > 0 ? (
                            q.options
                              .sort((a, b) => a.order_num - b.order_num)
                              .map((opt) => (
                                <div 
                                  key={opt.id}
                                  className="group flex items-center justify-between rounded-xl border border-slate-950/60 bg-slate-950/20 p-3 hover:bg-slate-950/40 transition"
                                >
                                  <div className="flex items-center gap-3 pr-4">
                                    {q.question_type === 'weighted' ? (
                                      <span className="flex h-6 px-2 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono font-bold">
                                        {opt.points || 0} pt{opt.points === 1 ? '' : 's'}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={loadingOptionId !== null}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (q.question_type === 'single') {
                                            handleSetOptionCorrectSingle(q.id, opt.id);
                                          } else {
                                            handleToggleOptionCorrectMultiple(q.id, opt.id);
                                          }
                                        }}
                                        className="focus:outline-none shrink-0 disabled:opacity-50 transition"
                                        title={q.question_type === 'single' ? 'Set as correct answer' : 'Toggle correctness'}
                                      >
                                        {loadingOptionId === opt.id ? (
                                          <div className="h-4 w-4 animate-spin rounded-full border border-blue-500/20 border-t-blue-500" />
                                        ) : opt.is_correct ? (
                                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow">
                                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                                          </span>
                                        ) : q.question_type === 'single' ? (
                                          <Circle className="h-5 w-5 text-slate-600 hover:text-emerald-500 transition" />
                                        ) : (
                                          <CheckSquare className="h-5 w-5 text-slate-600 hover:text-emerald-500 transition" />
                                        )}
                                      </button>
                                    )}
                                    <span className={`text-sm ${opt.is_correct && q.question_type !== 'weighted' ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                                      {opt.option_text}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => openEditOptModal(q.id, opt)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteOpt(opt.id)}
                                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10"
                                    >
                                      <Trash className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <p className="text-xs text-slate-600 italic">{t('noOptions')}</p>
                          )}
                        </div>
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs">
                          <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('explanation')}</span>
                          </div>
                          <div className="text-slate-400 leading-relaxed">
                            {renderExplanationWithCode(q.explanation)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <HelpCircle className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">{t('noQuestions')}</h3>
          <p className="mt-1 text-sm">{t('noQuestionsSub')}</p>
        </div>
      )}

      {/* --- QUESTION FORM MODAL --- */}
      {isQModalOpen && (
        <div 
          onClick={() => setIsQModalOpen(false)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingQuestion ? t('editQuestion') : t('createQuestion')}
              </h2>
              <button onClick={() => setIsQModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQ(onSubmitQ)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t('questionText')}</label>
                <textarea
                  rows={3}
                  {...registerQ('question_text')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 resize-none"
                />
                {errorsQ.question_text && <p className="text-xs text-rose-400">{errorsQ.question_text.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('selectionType')}</label>
                  <select
                    {...registerQ('question_type')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="single">{t('singleChoice')}</option>
                    <option value="multiple">{t('multipleChoice')}</option>
                    <option value="weighted">{t('weightedChoice')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('pointsAwarded')}</label>
                  <input
                    type="number"
                    {...registerQ('points')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errorsQ.points && <p className="text-xs text-rose-400">{errorsQ.points.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('displayOrder')}</label>
                  <input
                    type="number"
                    {...registerQ('order_num')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errorsQ.order_num && <p className="text-xs text-rose-400">{errorsQ.order_num.message}</p>}
                </div>
              </div>

              {/* Passage selector */}
              {passages.length > 0 && (
                <div className="space-y-2 border-t border-slate-800/60 pt-4">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-violet-400" />
                    Lampirkan ke Passage (opsional)
                  </label>
                  <select
                    value={selectedPassageId ?? ''}
                    onChange={(e) => setSelectedPassageId(e.target.value || null)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-violet-500"
                  >
                    <option value="">— Soal mandiri (tanpa passage) —</option>
                    {passages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title || `Passage #${p.order_num + 1}`}
                      </option>
                    ))}
                  </select>
                  {selectedPassageId && (
                    <p className="text-xs text-violet-400 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Soal ini akan dikelompokkan dengan soal lain di passage yang sama dan tidak akan diacak secara terpisah.
                    </p>
                  )}
                </div>
              )}

              {/* Code block section */}
              <div className="space-y-4 border-t border-slate-800/60 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('codeLanguageOptional')}</label>
                  <select
                    {...registerQ('code_language')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">{t('nonePlainQuestion')}</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="sql">SQL</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="csharp">C#</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                    <option value="swift">Swift</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="yaml">YAML</option>
                    <option value="markdown">Markdown</option>
                    <option value="xml">XML</option>
                  </select>
                </div>

                {watchLanguage && watchLanguage !== '' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{t('codeContent')}</label>
                    <textarea
                      rows={5}
                      {...registerQ('code_content')}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 font-mono text-xs text-slate-200 outline-none focus:border-blue-500 resize-y"
                      placeholder={t('codePlaceholder')}
                    />

                    {watchCodeContent && watchCodeContent.trim() !== '' && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-slate-500">{t('liveCodePreview')}</span>
                        <CodeBlock language={watchLanguage} code={watchCodeContent} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t('explanationReview')}</label>
                <textarea
                  rows={4}
                  {...registerQ('explanation')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 resize-y"
                  placeholder={t('explanationPlaceholderMarkdown')}
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsQModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isQSubmitLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isQSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <span>{tc('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OPTION FORM MODAL --- */}
      {isOptModalOpen && (
        <div 
          onClick={() => setIsOptModalOpen(false)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingOption ? t('editAnswerOption') : t('addAnswerOption')}
              </h2>
              <button onClick={() => setIsOptModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOpt(onSubmitOpt)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t('optionLabel')}</label>
                <input
                  type="text"
                  {...registerOpt('option_text')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errorsOpt.option_text && <p className="text-xs text-rose-400">{errorsOpt.option_text.message}</p>}
              </div>

              {isWeighted ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('optionPoints')}</label>
                  <input
                    type="number"
                    {...registerOpt('points')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errorsOpt.points && <p className="text-xs text-rose-400">{errorsOpt.points.message}</p>}
                </div>
              ) : (
                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    {...registerOpt('is_correct')}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="text-sm text-slate-300 font-semibold">{t('isCorrect')}</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOptModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isOptSubmitLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isOptSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <span>{tc('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BULK POINTS FORM MODAL --- */}
      {isBulkModalOpen && (
        <div 
          onClick={() => setIsBulkModalOpen(false)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{t('bulkPointsTitle')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('bulkPointsSub')}</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setBulkType('equal')}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${bulkType === 'equal' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('equalPoints')}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkType('distribute')}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition ${bulkType === 'distribute' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t('distributePoints')}
                </button>
              </div>

              {bulkType === 'equal' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">{t('pointsPerQuestion')}</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkPointsValue}
                    onChange={(e) => setBulkPointsValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">{t('targetTotalPoints')}</label>
                    <input
                      type="number"
                      min={questions.length}
                      value={bulkTotalPointsValue}
                      onChange={(e) => setBulkTotalPointsValue(Math.max(questions.length, parseInt(e.target.value, 10) || questions.length))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-3.5 text-xs text-blue-400 flex gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{getDistributePreview()}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPoints}
                  disabled={isBulkSubmitLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 transition"
                >
                  {isBulkSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <span>{t('apply')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PASSAGE MANAGER MODAL --- */}
      {isPassageModalOpen && (
        <div
          onClick={() => setIsPassageModalOpen(false)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-400" />
                  Kelola Passage Teks
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Passage adalah teks wacana yang digunakan bersama oleh beberapa soal.</p>
              </div>
              <button onClick={() => setIsPassageModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing passages */}
            {passages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Passage yang ada</h3>
                {passages.map((p) => {
                  const linked = questions.filter(q => q.passage_id === p.id).length;
                  return (
                    <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-violet-300">{p.title || `Passage #${p.order_num + 1}`}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{linked} soal terhubung</p>
                        </div>
                        <button
                          onClick={() => handleDeletePassage(p.id)}
                          className="shrink-0 rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition"
                          title="Hapus passage"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{p.body}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create new passage form */}
            <div className="space-y-4 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Buat Passage Baru</h3>
              {passageFormError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">{passageFormError}</div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Judul Passage (opsional)</label>
                <input
                  type="text"
                  placeholder="contoh: Teks 1, Bacaan A, ..."
                  value={passageForm.title}
                  onChange={(e) => setPassageForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Isi Teks / Wacana <span className="text-rose-400">*</span></label>
                <textarea
                  rows={6}
                  placeholder="Tulis teks wacana di sini..."
                  value={passageForm.body}
                  onChange={(e) => setPassageForm(f => ({ ...f, body: e.target.value }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-violet-500 resize-y"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreatePassage}
                  disabled={isPassageSubmitLoading}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition"
                >
                  {isPassageSubmitLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
                  <Plus className="h-4 w-4" />
                  <span>Buat Passage</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderExplanationWithCode(text: string | null) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const content = part.slice(3, -3);
      const firstNewlineIdx = content.indexOf('\n');
      let language = 'text';
      let code = content;
      if (firstNewlineIdx !== -1) {
        const potentialLang = content.slice(0, firstNewlineIdx).trim();
        if (potentialLang && potentialLang.length < 15) {
          language = potentialLang;
          code = content.slice(firstNewlineIdx + 1);
        }
      }
      return <CodeBlock key={idx} language={language} code={code} />;
    } else {
      return (
        <span key={idx} className="whitespace-pre-wrap block my-1">
          {part}
        </span>
      );
    }
  });
}
