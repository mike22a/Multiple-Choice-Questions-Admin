'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { 
  BarChart3, 
  Search, 
  Eye, 
  Clock, 
  Award, 
  AlertTriangle, 
  HelpCircle,
  X,
  Check,
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import CodeBlock from '@/components/CodeBlock';

interface AttemptListItem {
  id: string;
  quizTitle: string;
  fullName: string;
  email: string;
  status: 'in_progress' | 'submitted' | 'force_submitted' | 'expired';
  score: number | null;
  startedAt: string;
  submittedAt: string | null;
  safeModeViolations: number;
}

interface AttemptDetail {
  attempt: {
    id: string;
    quizId: string;
    quizTitle: string;
    fullName: string;
    email: string;
    status: string;
    score: number | null;
    totalQuestions: number;
    correctAnswers: number;
    startedAt: string;
    submittedAt: string | null;
    safeModeViolations: number;
    passScore: number;
  };
  questions: Array<{
    id: string;
    questionText: string;
    questionType: 'single' | 'multiple';
    points: number;
    explanation: string | null;
    codeLanguage?: string | null;
    codeContent?: string | null;
    options: Array<{
      id: string;
      optionText: string;
      isCorrect: boolean;
    }>;
    userResponse: {
      selectedOptionIds: string[];
      isCorrect: boolean;
      pointsEarned: number;
      answeredAt: string | null;
    };
  }>;
}

export default function ResultsPage() {
  const tc = useTranslations('Common');
  const tRes = useTranslations('Results');
  
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const itemsPerPage = 10;

  // Metrics state
  const [metrics, setMetrics] = useState({
    totalMatching: 0,
    totalEvaluated: 0,
    averageScore: 0,
    passRate: 0,
  });

  // Attempt Detail Modal states
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadQuizzes = async () => {
    try {
      const quizListRes = await apiClient('/api/admin/quizzes?limit=100');
      const quizList = quizListRes?.data || quizListRes;
      const quizzesData = quizList?.quizzes || quizList || [];
      setQuizzes(quizzesData.map((q: any) => ({ id: q.id, title: q.title })));
    } catch (err) {
      console.error('Failed to load quizzes for filter', err);
    }
  };

  const loadAttempts = async (page = 1, searchQuery = '', quizId = 'all', status = 'all') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (quizId && quizId !== 'all') {
        params.append('quiz_id', quizId);
      }
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const res = await apiClient(`/api/admin/attempts?${params.toString()}`);
      const data = res?.data || res;
      setAttempts(data?.attempts || []);
      setMetrics(data?.metrics || {
        totalMatching: 0,
        totalEvaluated: 0,
        averageScore: 0,
        passRate: 0,
      });
      setTotalAttempts(data?.pagination?.total || 0);
      setTotalPages(Math.ceil((data?.pagination?.total || 0) / itemsPerPage));
    } catch (err: any) {
      setError(err?.message || 'Failed to load attempts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadAttempts(currentPage, search, selectedQuizId, selectedStatus);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [currentPage, search, selectedQuizId, selectedStatus]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleQuizChange = (val: string) => {
    setSelectedQuizId(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setCurrentPage(1);
  };

  const loadAttemptDetail = async (id: string) => {
    setIsDetailLoading(true);
    setAttemptDetail(null);
    setSelectedAttemptId(id);
    try {
      const res = await apiClient(`/api/admin/attempts/${id}`);
      setAttemptDetail(res?.data || res);
    } catch (err: any) {
      alert(err?.message || 'Failed to load attempt details');
      setSelectedAttemptId(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleForceSubmit = async (id: string) => {
    if (!confirm('Are you sure you want to force-submit this active quiz session? It will grade their current Redis draft.')) return;
    setIsActionLoading(true);
    try {
      await apiClient(`/api/admin/attempts/${id}/force-submit`, { method: 'POST' });
      loadAttempts(currentPage, search, selectedQuizId, selectedStatus);
      if (selectedAttemptId === id) {
        loadAttemptDetail(id);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to force submit');
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredAttempts = attempts;

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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{tRes('title')}</h1>
        <p className="mt-2 text-slate-400">{tRes('subtitle')}</p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tRes('totalEvaluated')}</p>
          <h3 className="text-3xl font-bold tracking-tight text-white mt-2">{metrics.totalEvaluated} / {metrics.totalMatching}</h3>
          <p className="text-xs text-slate-500 mt-2">{tRes('totalEvaluatedSub')}</p>
        </div>
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tRes('averageScore')}</p>
          <h3 className="text-3xl font-bold tracking-tight text-blue-400 mt-2">{metrics.averageScore}%</h3>
          <p className="text-xs text-slate-500 mt-2">{tRes('averageScoreSub')}</p>
        </div>
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tRes('passRate')}</p>
          <h3 className="text-3xl font-bold tracking-tight text-emerald-400 mt-2">{metrics.passRate}%</h3>
          <p className="text-xs text-slate-500 mt-2">{tRes('passRateSub')}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6">
        <div className="flex max-w-sm w-full items-center gap-2 rounded-xl border border-slate-900 bg-slate-900/30 px-3.5 py-2.5 backdrop-blur-xl">
          <Search className="h-5 w-5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder={tRes('searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Quiz filter */}
          <select
            value={selectedQuizId}
            onChange={(e) => handleQuizChange(e.target.value)}
            className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 text-xs text-slate-300 outline-none hover:bg-slate-900 hover:text-white"
          >
            <option value="all">{tRes('allQuizzes')}</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 text-xs text-slate-300 outline-none hover:bg-slate-900 hover:text-white"
          >
            <option value="all">{tRes('allStatuses')}</option>
            <option value="submitted">{tRes('submitted')}</option>
            <option value="force_submitted">{tRes('forceSubmitted')}</option>
            <option value="expired">{tRes('expired')}</option>
            <option value="in_progress">{tRes('inProgress')}</option>
          </select>
        </div>
      </div>

      {/* Attempts Grid / Table */}
      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : filteredAttempts.length > 0 ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl overflow-hidden w-full min-w-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/20">
                    <th className="py-4 px-6">{tRes('candidate')}</th>
                    <th className="py-4 px-6">{tRes('quiz')}</th>
                    <th className="py-4 px-6">{tRes('status')}</th>
                    <th className="py-4 px-6 text-center">{tRes('violations')}</th>
                    <th className="py-4 px-6 text-right">{tRes('score')}</th>
                    <th className="py-4 px-6 text-right">{tc('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {filteredAttempts.map((att) => {
                    const isPass = att.score !== null && att.score >= 70;
                    return (
                      <tr key={att.id} className="hover:bg-slate-900/20 transition">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-white">{att.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{att.email}</p>
                        </td>
                        <td className="py-4 px-6 text-slate-300 font-medium">{att.quizTitle}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            att.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400' :
                            att.status === 'force_submitted' ? 'bg-cyan-500/10 text-cyan-400' :
                            att.status === 'expired' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {att.status === 'submitted' ? tRes('submitted') :
                             att.status === 'force_submitted' ? tRes('forceSubmitted') :
                             att.status === 'expired' ? tRes('expired') :
                             tRes('inProgress')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold ${att.safeModeViolations > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-500'}`}>
                            {att.safeModeViolations}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-bold">
                          {att.score !== null ? (
                            <span className={isPass ? 'text-emerald-400' : 'text-rose-400'}>
                              {att.score}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                          {att.status === 'in_progress' ? (
                            <button
                              onClick={() => handleForceSubmit(att.id)}
                              disabled={isActionLoading}
                              title={tRes('forceSubmit')}
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500 hover:text-white transition disabled:opacity-50"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span>{tRes('forceSubmit')}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => loadAttemptDetail(att.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{tRes('viewDetails')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination UI */}
          {totalAttempts > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-900 pt-6 text-sm text-slate-400">
              <div>
                {tc('showingRange', { start: (currentPage - 1) * itemsPerPage + 1, end: Math.min(currentPage * itemsPerPage, totalAttempts), total: totalAttempts })}
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
          <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">{tRes('noResults')}</h3>
          <p className="mt-1 text-sm">{tRes('noResultsSub')}</p>
        </div>
      )}

      {/* Detailed Attempt Evaluation Modal */}
      {selectedAttemptId && (
        <div 
          onClick={() => setSelectedAttemptId(null)}
          className="fixed inset-0 z-[9999] modal-backdrop !mt-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-[95%] max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{tRes('candidateReview')}</span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {attemptDetail ? attemptDetail.attempt.fullName : 'Loading details...'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAttemptId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
              </div>
            ) : attemptDetail ? (
              <div className="space-y-6">
                {/* Attempt Summary Stats */}
                <div className="grid gap-4 sm:grid-cols-4 rounded-2xl bg-slate-950/50 p-4 border border-slate-800/40 text-center text-xs">
                  <div>
                    <span className="text-slate-500">{tRes('quiz')}</span>
                    <p className="font-bold text-white mt-1 truncate">{attemptDetail.attempt.quizTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">{tRes('scoreAchieved')}</span>
                    <p className={`font-bold mt-1 text-base ${attemptDetail.attempt.score !== null && attemptDetail.attempt.score >= attemptDetail.attempt.passScore ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {attemptDetail.attempt.score}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">{tRes('correctAnswers')}</span>
                    <p className="font-bold text-white mt-1">
                      {attemptDetail.attempt.correctAnswers} / {attemptDetail.attempt.totalQuestions}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">{tRes('proctorViolations')}</span>
                    <p className={`font-bold mt-1 ${attemptDetail.attempt.safeModeViolations > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
                      {attemptDetail.attempt.safeModeViolations}
                    </p>
                  </div>
                </div>

                {/* Candidate Answers Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">{tRes('questions')}</h3>
                  
                  {attemptDetail.questions.map((q, idx) => {
                    const ans = q.userResponse;
                    const isCorrect = ans.isCorrect;
                    return (
                      <div key={q.id} className="rounded-xl border border-slate-950 bg-slate-950/20 p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-2">
                            <span className="text-slate-500 font-bold">{idx + 1}.</span>
                            <span className="text-sm text-slate-200">{q.questionText}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isCorrect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>{tRes('pts', { points: q.points })}</span>
                          </span>
                        </div>

                        {/* Code Block */}
                        {q.codeLanguage && q.codeContent && (
                          <CodeBlock language={q.codeLanguage} code={q.codeContent} />
                        )}

                        {/* Options List */}
                        <div className="space-y-2 pl-5 text-xs">
                          {q.options.map((opt) => {
                            const isSelected = ans.selectedOptionIds.includes(opt.id);
                            return (
                              <div 
                                key={opt.id}
                                className={`flex items-center gap-2.5 rounded-lg p-2 ${
                                  isSelected && opt.isCorrect ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400' :
                                  isSelected && !opt.isCorrect ? 'bg-rose-500/5 border border-rose-500/20 text-rose-400' :
                                  !isSelected && opt.isCorrect ? 'bg-slate-900 text-emerald-400 font-semibold' :
                                  'text-slate-400'
                                }`}
                              >
                                {opt.isCorrect ? (
                                  <span className="h-4 w-4 shrink-0 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">✔</span>
                                ) : (
                                  <span className="h-4 w-4 shrink-0 rounded-full border border-slate-700" />
                                )}
                                <span>{opt.optionText}</span>
                                {isSelected && <span className="text-[10px] uppercase font-bold tracking-wider">{tRes('candidateChoice')}</span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {q.explanation && (
                          <div className="rounded-lg bg-slate-900 p-3 text-[11px] text-slate-400 border border-slate-800/40">
                            <span className="font-bold text-slate-300 block mb-1">{tRes('explanation')}:</span>
                            <div className="leading-relaxed">
                              {renderExplanationWithCode(q.explanation)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer close */}
                <div className="flex items-center justify-end border-t border-slate-800 pt-4">
                  <button
                    onClick={() => setSelectedAttemptId(null)}
                    className="rounded-xl bg-slate-900 border border-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    {tc('close')}
                  </button>
                </div>
              </div>
            ) : null}
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
