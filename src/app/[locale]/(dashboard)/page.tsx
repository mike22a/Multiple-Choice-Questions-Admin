'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { 
  BookOpen, 
  Users, 
  Play, 
  Award, 
  Calendar,
  AlertCircle,
  FileCheck,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id, enUS } from 'date-fns/locale';

interface DashboardStats {
  quizzes: { total: number; published: number; draft: number };
  participants: { total: number; active: number; inactive: number };
  attempts: { total: number; avgScore: number };
  recentAttempts: Array<{
    id: string;
    quizTitle: string;
    fullName: string;
    email: string;
    status: 'in_progress' | 'submitted' | 'force_submitted' | 'expired';
    score: number | null;
    startedAt: string;
    submittedAt: string | null;
  }>;
}

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const tc = useTranslations('Common');
  const tDash = useTranslations('Dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiClient('/api/admin/dashboard/stats');
        setStats(res?.data || res);
      } catch (err: any) {
        setError(err?.message || tDash('failedFetchStats'));
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  const dateLocale = locale === 'id' ? id : enUS;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
          <span className="text-slate-400 text-sm">{tc('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-400">
        <AlertCircle className="mx-auto mb-3 h-10 w-10" />
        <h3 className="font-bold text-lg">{tDash('errorStats')}</h3>
        <p className="mt-1 text-sm text-rose-500/80">{error}</p>
      </div>
    );
  }

  const cards = [
    {
      title: tDash('totalQuizzes'),
      value: stats?.quizzes.total || 0,
      subtext: tDash('quizzesSubtext', { published: stats?.quizzes.published || 0, draft: stats?.quizzes.draft || 0 }),
      icon: BookOpen,
      color: 'from-blue-600 to-cyan-500 shadow-blue-500/15',
    },
    {
      title: tDash('participants'),
      value: stats?.participants.total || 0,
      subtext: tDash('participantsSubtext', { active: stats?.participants.active || 0 }),
      icon: Users,
      color: 'from-indigo-600 to-purple-500 shadow-indigo-500/15',
    },
    {
      title: tDash('totalAttempts'),
      value: stats?.attempts.total || 0,
      subtext: tDash('attemptsSubtext'),
      icon: Play,
      color: 'from-emerald-600 to-teal-500 shadow-emerald-500/15',
    },
    {
      title: tDash('averageScore'),
      value: `${stats?.attempts.avgScore || 0}%`,
      subtext: tDash('averageSubtext'),
      icon: Award,
      color: 'from-amber-600 to-orange-500 shadow-amber-500/15',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{tDash('title')}</h1>
        <p className="mt-2 text-slate-400">{tDash('subtitle')}</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <div 
            key={index} 
            className="relative overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur-xl transition hover:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{card.title}</p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight text-white">{card.value}</h3>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-lg`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div className="grid gap-8 lg:grid-cols-3 w-full min-w-0">
        {/* Recent Attempts Table */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 backdrop-blur-xl lg:col-span-2 space-y-6 w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{tDash('recentAttempts')}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>{tDash('realtimeFeeds')}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">{tDash('candidate')}</th>
                  <th className="pb-3 px-4">{tDash('quiz')}</th>
                  <th className="pb-3 px-4">{tDash('status')}</th>
                  <th className="pb-3 px-4 text-right">{tDash('score')}</th>
                  <th className="pb-3 pl-4 text-right">{tDash('started')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {stats?.recentAttempts && stats.recentAttempts.length > 0 ? (
                  stats.recentAttempts.map((att) => (
                    <tr key={att.id} className="group hover:bg-slate-900/20 transition">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-white group-hover:text-blue-400 transition">{att.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{att.email}</p>
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {att.quizTitle}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          att.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400' :
                          att.status === 'force_submitted' ? 'bg-cyan-500/10 text-cyan-400' :
                          att.status === 'expired' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {att.status === 'submitted' ? tDash('submitted') :
                           att.status === 'force_submitted' ? tDash('forceSubmitted') :
                           att.status === 'expired' ? tDash('expired') :
                           tDash('inProgress')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-white">
                        {att.score !== null ? `${att.score}%` : '-'}
                      </td>
                      <td className="py-4 pl-4 text-right text-xs text-slate-500">
                        {formatDistanceToNow(new Date(att.startedAt), { addSuffix: true, locale: dateLocale })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <FileCheck className="mx-auto mb-2 h-8 w-8 opacity-45" />
                      {tDash('noRecentAttempts')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Quick Start Info Panel */}
        <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 backdrop-blur-xl space-y-6">
          <h2 className="text-xl font-bold text-white">{tDash('quickTasks')}</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-xl bg-slate-900/60 p-4 border border-slate-800/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{tDash('activeTestWindow')}</h4>
                <p className="mt-1 text-xs text-slate-400">{tDash('activeTestWindowSub')}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl bg-slate-900/60 p-4 border border-slate-800/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{tDash('gradingProctoring')}</h4>
                <p className="mt-1 text-xs text-slate-400">{tDash('gradingProctoringSub')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
