'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname, Link } from '@/navigation';
import { useTranslations } from 'next-intl';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  User,
  ChevronDown,
  FolderTree
} from 'lucide-react';

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export default function DashboardLayout({ children, params: { locale } }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Sidebar');
  const tc = useTranslations('Common');

  const { profile, isAuthenticated, clearAuth } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Monitor store hydration
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => unsub();
  }, []);

  // Authentication Guard + Hydration safety
  useEffect(() => {
    setIsMounted(true);
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!isMounted || !hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
          <span className="text-sm font-medium">{tc('loading')}</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('quizzes'), href: '/quizzes', icon: BookOpen },
    { name: t('categories'), href: '/categories', icon: FolderTree },
    { name: t('participants'), href: '/participants', icon: Users },
    { name: t('results'), href: '/results', icon: BarChart3 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'id' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-900">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
              <span className="font-bold text-lg">M</span>
            </div>
            <span className="font-bold tracking-tight text-white">{tc('title')}</span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>{tc('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <div className="lg:pl-64 w-full min-w-0">
        {/* Header bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-900 bg-slate-950/70 px-6 backdrop-blur-md">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Right menu tools */}
          <div className="ml-auto flex items-center gap-4">
            {/* Language Selector */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'EN' : 'ID'}</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 pr-3 text-sm text-slate-300 hover:bg-slate-900 hover:text-white focus:outline-none"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden text-left lg:block">
                  <p className="text-xs font-bold leading-none text-white">{profile?.fullName}</p>
                  <p className="mt-0.5 text-[10px] leading-none text-slate-400 capitalize">{profile?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 z-20 w-48 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-xl">
                    <div className="px-3 py-2 text-xs border-b border-slate-800 mb-1">
                      <p className="font-semibold text-slate-400">Logged in as</p>
                      <p className="font-bold text-white truncate">{profile?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{tc('logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <main className="min-h-[calc(100vh-4rem)] p-6 lg:p-8 w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
