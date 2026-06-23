'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';
import { useRouter, usePathname, Link } from '@/navigation';
import { LogIn, Shield, Globe, Lock, User, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Auth');
  const tc = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response && response.token && response.profile) {
        setAuth(response.token, response.profile);
        router.push('/');
      } else {
        setError(t('invalidCredentials'));
      }
    } catch (err: any) {
      setError(err?.message || t('invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'id' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Background glowing decorations */}
      <div className="absolute top-0 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Floating Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-6 right-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 backdrop-blur-md transition hover:bg-slate-800 hover:text-white"
      >
        <Globe className="h-4 w-4" />
        <span>{locale === 'en' ? 'Bahasa Indonesia' : 'English'}</span>
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md px-6 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo / Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {t('loginTitle')}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {tc('title')}
            </p>
          </div>

          {/* Form Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('username')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="admin"
                  {...register('username')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {errors.username && (
                <p className="text-xs text-rose-400">{errors.username.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                {t('password')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>{t('loggingIn')}</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{t('signIn')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
