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
  FolderTree,
  ChevronLeft,
  ChevronRight
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Sync collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const handleToggleSidebar = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
      {/* Background glowing decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-blue-600/5 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] rounded-full bg-indigo-600/5 blur-[150px]" />
      </div>

      {/* Sidebar Navigation */}
      <aside className={`hidden lg:block fixed top-0 bottom-0 left-0 z-50 border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Floating absolute collapse button for desktop */}
        <button 
          onClick={handleToggleSidebar} 
          className="absolute top-5 -right-3 z-50 h-6 w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white hover:scale-110 shadow-lg shadow-black/50 transition-all duration-200"
          title={isSidebarCollapsed ? tc('expand') : tc('collapse')}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-900">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
              <span className="font-bold text-lg">M</span>
            </div>
            <span className={`font-bold tracking-tight text-white transition-all duration-300 truncate ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'}`}>
              {tc('title')}
            </span>
          </Link>
        </div>

        <nav className="space-y-1.5 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}`}
                onClick={() => setIsSidebarOpen(false)}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={`truncate transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
            title={isSidebarCollapsed ? tc('logout') : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={`truncate transition-all duration-300 ${isSidebarCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'}`}>
              {tc('logout')}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <div className={`transition-[padding-left] duration-300 w-full min-w-0 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Header bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-900 bg-slate-950/70 px-6 backdrop-blur-md">
          {/* Logo for mobile view */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
              <span className="font-bold text-sm">M</span>
            </div>
            <span className="font-bold tracking-tight text-white text-sm">
              {tc('title')}
            </span>
          </Link>

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
                      <p className="font-semibold text-slate-400">{tc('loggedInAs')}</p>
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
        <main className="min-h-[calc(100vh-4rem)] px-6 pt-6 pb-24 lg:p-8 w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-900 bg-slate-950/80 backdrop-blur-xl flex justify-around items-center h-16 px-2 shadow-2xl shadow-black/80">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-w-0 transition-all duration-200 ${isActive ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-medium mt-1 truncate w-full text-center">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
