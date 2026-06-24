'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useRouter, Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import CodeBlock from '@/components/CodeBlock';
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
  AlertCircle
} from 'lucide-react';

const questionSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['single', 'multiple']),
  points: z.coerce.number().min(1, 'Points must be at least 1'),
  explanation: z.string().optional().nullable(),
  order_num: z.coerce.number().min(1),
  code_language: z.string().optional().nullable(),
  code_content: z.string().optional().nullable(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

const optionSchema = z.object({
  option_text: z.string().min(1, 'Option text is required'),
  is_correct: z.boolean().default(false),
});

type OptionFormValues = z.infer<typeof optionSchema>;

interface AnswerOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_num: number;
}

interface QuestionImage {
  id: string;
  public_url: string;
  alt_text: string;
  order_num: number;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'single' | 'multiple';
  points: number;
  explanation: string | null;
  order_num: number;
  code_language?: string | null;
  code_content?: string | null;
  options?: AnswerOption[];
  images?: QuestionImage[];
}

export default function QuestionsPage({ params }: { params: { id: string } }) {
  const quizId = params.id;
  const router = useRouter();
  const tc = useTranslations('Common');

  const [quizTitle, setQuizTitle] = useState('Quiz Questions');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch questions
      const dataRes = await apiClient(`/api/admin/quizzes/${quizId}/questions`);
      const data = dataRes?.data || dataRes || [];
      setQuestions(data);
      
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

  useEffect(() => {
    loadData();
  }, [quizId]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // --- QUESTION ACTIONS ---
  const openCreateQModal = () => {
    setEditingQuestion(null);
    resetQ({
      question_text: '',
      question_type: 'single',
      points: 10,
      explanation: '',
      order_num: questions.length + 1,
      code_language: '',
      code_content: '',
    });
    setIsQModalOpen(true);
  };

  const openEditQModal = (q: Question) => {
    setEditingQuestion(q);
    resetQ({
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      explanation: q.explanation || '',
      order_num: q.order_num,
      code_language: q.code_language || '',
      code_content: q.code_content || '',
    });
    setIsQModalOpen(true);
  };

  const onSubmitQ = async (data: QuestionFormValues) => {
    setIsQSubmitLoading(true);
    try {
      if (editingQuestion) {
        await apiClient(`/api/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        await apiClient(`/api/admin/quizzes/${quizId}/questions`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setIsQModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to save question');
    } finally {
      setIsQSubmitLoading(false);
    }
  };

  const handleDeleteQ = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question? All its options will be deleted too.')) return;
    try {
      await apiClient(`/api/admin/questions/${qId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete question');
    }
  };

  // --- OPTION ACTIONS ---
  const openCreateOptModal = (qId: string) => {
    setTargetQuestionId(qId);
    setEditingOption(null);
    resetOpt({
      option_text: '',
      is_correct: false,
    });
    setIsOptModalOpen(true);
  };

  const openEditOptModal = (qId: string, opt: AnswerOption) => {
    setTargetQuestionId(qId);
    setEditingOption(opt);
    resetOpt({
      option_text: opt.option_text,
      is_correct: opt.is_correct,
    });
    setIsOptModalOpen(true);
  };

  const onSubmitOpt = async (data: OptionFormValues) => {
    if (!targetQuestionId) return;
    setIsOptSubmitLoading(true);
    try {
      if (editingOption) {
        await apiClient(`/api/admin/options/${editingOption.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } else {
        await apiClient(`/api/admin/questions/${targetQuestionId}/options`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setIsOptModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to save option');
    } finally {
      setIsOptSubmitLoading(false);
    }
  };

  const handleDeleteOpt = async (optId: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;
    try {
      await apiClient(`/api/admin/options/${optId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete option');
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
    } catch (err: any) {
      alert(err?.message || 'Failed to upload image. Please check API connection.');
    } finally {
      setIsUploadingImage(null);
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      await apiClient(`/api/admin/images/${imgId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete image');
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-3">
        <Link
          href="/quizzes"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Quiz Questions Manager</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{quizTitle}</h1>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">{questions.length} questions total</p>
        <button
          onClick={openCreateQModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Question</span>
        </button>
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
                        <h3 className="font-semibold text-white text-sm md:text-base pr-4 line-clamp-1">{q.question_text}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span className="capitalize">{q.question_type} choice</span>
                          <span>•</span>
                          <span>{q.points} points</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEditQModal(q)}
                        title="Edit question text"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQ(q.id)}
                        title="Delete question"
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
                          <span>{isUploadingImage === q.id ? 'Uploading...' : 'Upload Image'}</span>
                        </label>
                      </div>

                      {/* Answer Options Header */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-900/60 pb-2">
                          <h4 className="font-bold text-slate-300 text-sm">Answer Options</h4>
                          <button
                            onClick={() => openCreateOptModal(q.id)}
                            className="flex items-center gap-1 text-xs text-blue-400 font-semibold hover:text-blue-300 transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Option</span>
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
                                    {opt.is_correct ? (
                                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                                        <Check className="h-3 w-3" />
                                      </span>
                                    ) : q.question_type === 'single' ? (
                                      <Circle className="h-5 w-5 shrink-0 text-slate-600" />
                                    ) : (
                                      <CheckSquare className="h-5 w-5 shrink-0 text-slate-600" />
                                    )}
                                    <span className={`text-sm ${opt.is_correct ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
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
                            <p className="text-xs text-slate-600 italic">No options defined yet. Add at least one option.</p>
                          )}
                        </div>
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs">
                          <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Explanation</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{q.explanation}</p>
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
          <h3 className="font-bold text-lg text-white">No questions yet</h3>
          <p className="mt-1 text-sm">Add your first multiple-choice question to this quiz.</p>
        </div>
      )}

      {/* --- QUESTION FORM MODAL --- */}
      {isQModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-[95%] max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h2>
              <button onClick={() => setIsQModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQ(onSubmitQ)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Question Text</label>
                <textarea
                  rows={3}
                  {...registerQ('question_text')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 resize-none"
                />
                {errorsQ.question_text && <p className="text-xs text-rose-400">{errorsQ.question_text.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Selection Type</label>
                  <select
                    {...registerQ('question_type')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="single">Single Choice (Radio)</option>
                    <option value="multiple">Multiple Choice (Checkbox)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Points Awarded</label>
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
                  <label className="text-sm font-medium text-slate-300">Display Order</label>
                  <input
                    type="number"
                    {...registerQ('order_num')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                  {errorsQ.order_num && <p className="text-xs text-rose-400">{errorsQ.order_num.message}</p>}
                </div>
              </div>

              {/* Code block section */}
              <div className="space-y-4 border-t border-slate-800/60 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Code Snippet Language (Optional)</label>
                  <select
                    {...registerQ('code_language')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">None (Plain text question)</option>
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
                    <label className="text-sm font-medium text-slate-300">Code Snippet Content</label>
                    <textarea
                      rows={5}
                      {...registerQ('code_content')}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 font-mono text-xs text-slate-200 outline-none focus:border-blue-500 resize-y"
                      placeholder="Paste your syntax code block here..."
                    />

                    {watchCodeContent && watchCodeContent.trim() !== '' && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-slate-500">Live Code Preview</span>
                        <CodeBlock language={watchLanguage} code={watchCodeContent} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Explanation (Shown on result review)</label>
                <textarea
                  rows={2}
                  {...registerQ('explanation')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500 resize-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-[95%] max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                {editingOption ? 'Edit Answer Option' : 'Add Answer Option'}
              </h2>
              <button onClick={() => setIsOptModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOpt(onSubmitOpt)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Option Label / Text</label>
                <input
                  type="text"
                  {...registerOpt('option_text')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-slate-200 outline-none focus:border-blue-500"
                />
                {errorsOpt.option_text && <p className="text-xs text-rose-400">{errorsOpt.option_text.message}</p>}
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  {...registerOpt('is_correct')}
                  className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-sm text-slate-300 font-semibold">Is Correct Answer</span>
              </label>

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
    </div>
  );
}
