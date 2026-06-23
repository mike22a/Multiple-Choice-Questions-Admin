'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from '@/navigation';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SessionExpiredModal() {
  const router = useRouter();
  const { sessionExpired, setSessionExpired, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !sessionExpired) return null;

  const handleLogin = () => {
    setSessionExpired(false);
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-slate-900 p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/5">
            <ShieldAlert className="h-7 w-7" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-white">Sesi Anda Telah Berakhir</h2>
          <p className="text-sm text-slate-400">Untuk menjaga keamanan data Anda, silakan login kembali ke sistem.</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/10 hover:brightness-110 active:scale-[0.98] transition"
        >
          Login Kembali
        </button>
      </div>
    </div>
  );
}
