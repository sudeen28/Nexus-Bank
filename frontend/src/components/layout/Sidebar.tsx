'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../lib/utils';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, User,
  Bell, ShieldCheck, LogOut, Settings, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
];

const adminItems = [
  { href: '/admin', label: 'Admin Panel', icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-navy-900 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500 flex items-center justify-center">
            <span className="text-navy-900 font-bold text-lg font-display">N</span>
          </div>
          <div>
            <div className="text-white font-display font-semibold text-lg leading-none">NexusBank</div>
            <div className="text-white/40 text-xs mt-0.5">Secure Banking</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`sidebar-link ${isActive(href) ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
            {isActive(href) && <ChevronRight size={14} className="ml-auto opacity-60" />}
          </Link>
        ))}

        {user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role) && (
          <>
            <div className="px-4 pt-4 pb-1">
              <span className="text-white/25 text-xs font-semibold uppercase tracking-widest">Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`sidebar-link ${isActive(href) ? 'active' : ''}`}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all mb-1 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-navy-900 font-bold text-sm">
                {user ? getInitials(user.firstName, user.lastName) : '?'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-white/40 text-xs truncate">{user?.email}</div>
          </div>
        </Link>
        <button onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
