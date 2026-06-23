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
  
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Attempt Detail Modal states
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load dashboard stats which includes recent attempts
      const statsRes = await apiClient('/api/admin/dashboard/stats');
      const stats = statsRes?.data || statsRes;
      setAttempts(stats?.recentAttempts || []);

      // Load quizzes for filter
      const quizListRes = await apiClient('/api/admin/quizzes');
      const quizList = quizListRes?.data || quizListRes;
      setQuizzes(quizList.map((q: any) => ({ id: q.id, title: q.title })));
    } catch (err: any) {
      setError(err?.message || 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
      if (selectedAttemptId === id) {
        loadAttemptDetail(id);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to force submit');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter attempts
  const filteredAttempts = attempts.filter(att => {
    const matchesSearch = 
      att.fullName.toLowerCase().includes(search.toLowerCase()) ||
      att.email.toLowerCase().includes(search.toLowerCase()) ||
      att.quizTitle.toLowerCase().includes(search.toLowerCase());

    const matchesQuiz = selectedQuizId === 'all' || att.quizTitle === quizzes.find(q => q.id === selectedQuizId)?.title;
    const matchesStatus = selectedStatus === 'all' || att.status === selectedStatus;

    return matchesSearch && matchesQuiz && matchesStatus;
  });

  // Calculate Metrics
  const submittedAttempts = filteredAttempts.filter(a => a.status === 'submitted' || a.status === 'force_submitted');
  const averageScore = submittedAttempts.length > 0
    ? Math.round(submittedAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / submittedAttempts.length)
    : 0;
  const passRate = submittedAttempts.length > 0
    ? Math.round((submittedAttempts.filter(a => (a.score || 0) >= 70).length / submittedAttempts.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Results & Reports</h1>
        <p className="mt-2 text-slate-400">View real-time exam performances, evaluate candidate answers, and proctor violations.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Evaluated</p>
          <h3 className="text-3xl font-bold tracking-tight text-white mt-2">{submittedAttempts.length} / {filteredAttempts.length}</h3>
          <p className="text-xs text-slate-500 mt-2">Sessions closed & scored</p>
        </div>
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Average Score</p>
          <h3 className="text-3xl font-bold tracking-tight text-blue-400 mt-2">{averageScore}%</h3>
          <p className="text-xs text-slate-500 mt-2">Overall class standard</p>
        </div>
        <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pass Rate</p>
          <h3 className="text-3xl font-bold tracking-tight text-emerald-400 mt-2">{passRate}%</h3>
          <p className="text-xs text-slate-500 mt-2">Passing score default: 70%</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-900 pb-6">
        <div className="flex max-w-sm w-full items-center gap-2 rounded-xl border border-slate-900 bg-slate-900/30 px-3.5 py-2.5 backdrop-blur-xl">
          <Search className="h-5 w-5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Quiz filter */}
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 text-xs text-slate-300 outline-none hover:bg-slate-900 hover:text-white"
          >
            <option value="all">All Quizzes</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-900 bg-slate-900/40 px-3.5 py-2.5 text-xs text-slate-300 outline-none hover:bg-slate-900 hover:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="force_submitted">Force Submitted</option>
            <option value="expired">Expired</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {/* Attempts Grid / Table */}
      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
        </div>
      ) : filteredAttempts.length > 0 ? (
        <div className="rounded-2xl border border-slate-900 bg-slate-900/10 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/20">
                  <th className="py-4 px-6">Candidate</th>
                  <th className="py-4 px-6">Quiz Title</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Violations</th>
                  <th className="py-4 px-6 text-right">Score</th>
                  <th className="py-4 px-6 text-right">Actions</th>
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
                          {att.status.replace('_', ' ')}
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
                            title="Force submit session"
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500 hover:text-white transition disabled:opacity-50"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Force Submit</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => loadAttemptDetail(att.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Evaluate</span>
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
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <h3 className="font-bold text-lg text-white">No attempts found</h3>
          <p className="mt-1 text-sm">Waiting for candidates to take and submit active quizzes.</p>
        </div>
      )}

      {/* Detailed Attempt Evaluation Modal */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Candidate Detailed Evaluation</span>
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
                    <span className="text-slate-500">Quiz Title</span>
                    <p className="font-bold text-white mt-1 truncate">{attemptDetail.attempt.quizTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Score Achieved</span>
                    <p className={`font-bold mt-1 text-base ${attemptDetail.attempt.score !== null && attemptDetail.attempt.score >= attemptDetail.attempt.passScore ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {attemptDetail.attempt.score}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Correct Answers</span>
                    <p className="font-bold text-white mt-1">
                      {attemptDetail.attempt.correctAnswers} / {attemptDetail.attempt.totalQuestions}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Proctor Violations</span>
                    <p className={`font-bold mt-1 ${attemptDetail.attempt.safeModeViolations > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
                      {attemptDetail.attempt.safeModeViolations}
                    </p>
                  </div>
                </div>

                {/* Candidate Answers Breakdown */}
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">Questions Response Log</h3>
                  
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
                            <span>{q.points} pts</span>
                          </span>
                        </div>

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
                                {isSelected && <span className="text-[10px] uppercase font-bold tracking-wider">(Candidate choice)</span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {q.explanation && (
                          <div className="rounded-lg bg-slate-900 p-3 text-[11px] text-slate-400 border border-slate-800/40">
                            <span className="font-bold text-slate-300">Explanation:</span> {q.explanation}
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
                    Close Review
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
