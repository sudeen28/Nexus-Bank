'use client';
import { cn, formatCurrency, formatDateTime, getTxColor } from '../../lib/utils';
import type { Transaction } from '../../types';
import { ArrowDownLeft, ArrowUpRight, CreditCard, RefreshCw, Minus, AlertTriangle } from 'lucide-react';

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return (
    <svg className={`animate-spin ${s} text-navy-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: 'default' | 'navy' | 'gold';
  className?: string;
}

export function StatCard({ title, value, sub, icon, trend, variant = 'default', className }: StatCardProps) {
  const variants = {
    default: 'bg-white border border-slate-100',
    navy: 'bg-navy-900 text-white border-0',
    gold: 'bg-gradient-to-br from-gold-500 to-gold-400 text-navy-900 border-0',
  };
  const textColor = variant === 'default' ? 'text-navy-900' : 'text-inherit';
  const subColor = variant === 'default' ? 'text-slate-500' : variant === 'navy' ? 'text-white/50' : 'text-navy-700';

  return (
    <div className={cn('rounded-2xl p-5 shadow-card', variants[variant], className)}>
      <div className="flex items-start justify-between mb-4">
        <span className={cn('text-xs font-semibold uppercase tracking-wider', subColor)}>{title}</span>
        {icon && (
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center',
            variant === 'navy' ? 'bg-white/10' : variant === 'gold' ? 'bg-navy-900/10' : 'bg-slate-100')}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn('text-2xl font-display font-bold', textColor)}>{value}</div>
      {sub && <div className={cn('text-xs mt-1', subColor)}>{sub}</div>}
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs mt-2 font-medium',
          trend.value >= 0 ? 'text-emerald-500' : 'text-red-400')}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
const txIcons: Record<string, React.ReactNode> = {
  DEPOSIT: <ArrowDownLeft size={16} />,
  TRANSFER_IN: <ArrowDownLeft size={16} />,
  WITHDRAWAL: <ArrowUpRight size={16} />,
  TRANSFER_OUT: <ArrowUpRight size={16} />,
  CARD_PAYMENT: <CreditCard size={16} />,
  REFUND: <RefreshCw size={16} />,
  FEE: <Minus size={16} />,
};

const statusBadge: Record<string, string> = {
  COMPLETED: 'badge-green',
  PENDING: 'badge-yellow',
  FAILED: 'badge-red',
  REVERSED: 'badge-blue',
  FLAGGED: 'badge-red',
};

interface TxRowProps { tx: Transaction; compact?: boolean; }

export function TransactionRow({ tx, compact }: TxRowProps) {
  const isCredit = getTxColor(tx.type) === 'green';
  const icon = txIcons[tx.type];
  const iconBg = isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500';

  return (
    <div className={cn('flex items-center gap-4 hover:bg-slate-50 transition-colors rounded-xl',
      compact ? 'px-3 py-2.5' : 'px-4 py-3.5')}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-navy-900 truncate">{tx.description || tx.type}</div>
        <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(tx.createdAt)}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={cn('text-sm font-semibold', isCredit ? 'text-emerald-600' : 'text-red-500')}>
          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
        </div>
        {!compact && (
          <span className={cn('badge text-xs mt-0.5', statusBadge[tx.status] || 'badge-gray')}>
            {tx.isFlagged ? <><AlertTriangle size={10} className="inline mr-1" />Flagged</> : tx.status}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, action }: {
  icon?: string; title: string; desc?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <h3 className="text-navy-900 font-display font-semibold text-lg mb-1">{title}</h3>
      {desc && <p className="text-slate-400 text-sm mb-4 max-w-xs">{desc}</p>}
      {action}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-display font-semibold text-navy-900">{title}</h2>
      {action}
    </div>
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
