'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transfers': 'Transfers',
  '/cards': 'Cards',
  '/profile': 'Profile',
  '/notifications': 'Notifications',
  '/admin': 'Admin Panel',
};

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = pageTitles[pathname] || 'NexusBank';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-display font-semibold text-navy-900">{title}</h1>
        {pathname === '/dashboard' && (
          <p className="text-xs text-slate-400">{greeting}, {user?.firstName} 👋</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/notifications"
          className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
          <Bell size={16} />
        </Link>
      </div>
    </header>
  );
}
