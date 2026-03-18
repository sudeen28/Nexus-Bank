'use client';
import { useEffect, useState } from 'react';
import { accountsApi, transactionsApi } from '../../lib/api';
import { formatCurrency, formatDate, formatRelative, maskAccountNumber, getTransactionColor, getTransactionSign, getTransactionIcon, getStatusBadge, getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { AccountStats, Transaction } from '../../types';
import { TrendingUp, TrendingDown, ArrowLeftRight, CreditCard, Eye, EyeOff, RefreshCw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, txRes] = await Promise.all([
          accountsApi.getStats(),
          transactionsApi.getAll({ limit: 6 }),
        ]);
        setStats(statsRes.data.data);
        setTransactions(txRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const defaultAccount = stats?.accounts?.find(a => a.isDefault) || stats?.accounts?.[0];

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse h-32 bg-slate-100" />
        ))}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-navy-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs">
          <p className="font-semibold mb-1.5 text-white/70">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="capitalize text-white/80">{p.name}:</span>
              <span className="font-bold">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Balance card */}
        <div className="xl:col-span-2 relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white shadow-navy">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-64 h-64 rounded-full bg-gold-500/8 -top-12 -right-12" />
            <div className="absolute w-40 h-40 rounded-full bg-navy-700/60 bottom-0 left-1/3" />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-widest">Total Balance</p>
                <div className="flex items-end gap-3 mt-1">
                  <h2 className="text-4xl font-display font-bold tracking-tight">
                    {hideBalance ? '••••••' : formatCurrency(stats?.totalBalance || 0)}
                  </h2>
                  <button onClick={() => setHideBalance(!hideBalance)}
                    className="mb-1 text-white/40 hover:text-white/70 transition-colors">
                    {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gold-500/20 flex items-center justify-center">
                <TrendingUp size={22} className="text-gold-400" />
              </div>
            </div>
            {defaultAccount && (
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                <div>
                  <p className="text-white/40 text-xs">Account</p>
                  <p className="text-white font-mono text-sm tracking-wider">
                    {maskAccountNumber(defaultAccount.accountNumber)}
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 mx-1" />
                <div>
                  <p className="text-white/40 text-xs">Routing</p>
                  <p className="text-white font-mono text-sm">{defaultAccount.routingNumber}</p>
                </div>
                <div className="ml-auto">
                  <span className={`badge ${defaultAccount.isFrozen ? 'badge-red' : 'badge-green'} text-[10px]`}>
                    {defaultAccount.isFrozen ? 'Frozen' : 'Active'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Income */}
        <div className="card group hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monthly Income</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-navy-900">
            {hideBalance ? '••••' : formatCurrency(stats?.monthlyIncome || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">Last 30 days</p>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, ((stats?.monthlyIncome || 0) / Math.max(1, (stats?.monthlyIncome || 0) + (stats?.monthlyExpenses || 0))) * 100)}%` }} />
          </div>
        </div>

        {/* Expenses */}
        <div className="card group hover:shadow-card-hover transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monthly Expenses</p>
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-navy-900">
            {hideBalance ? '••••' : formatCurrency(stats?.monthlyExpenses || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">Last 30 days</p>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-red-400"
              style={{ width: `${Math.min(100, ((stats?.monthlyExpenses || 0) / Math.max(1, (stats?.monthlyIncome || 0) + (stats?.monthlyExpenses || 0))) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* ── Chart + Quick Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-navy-900">Cash Flow</h3>
              <p className="text-xs text-slate-400 mt-0.5">6-month income vs. expenses</p>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['area', 'bar'] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${chartType === t ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'area' ? (
              <AreaChart data={stats?.monthly || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#incomeGrad)" name="income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#expGrad)" name="expenses" />
              </AreaChart>
            ) : (
              <BarChart data={stats?.monthly || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="income" />
                <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="expenses" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card flex flex-col">
          <h3 className="font-display font-semibold text-navy-900 mb-5">Quick Actions</h3>
          <div className="space-y-3 flex-1">
            {[
              { href: '/transfers?tab=send', icon: ArrowLeftRight, label: 'Send Money', desc: 'Transfer to any account', color: 'bg-navy-50 text-navy-700', hover: 'hover:bg-navy-100' },
              { href: '/transfers?tab=deposit', icon: TrendingUp, label: 'Deposit Funds', desc: 'Add money to your account', color: 'bg-emerald-50 text-emerald-700', hover: 'hover:bg-emerald-100' },
              { href: '/cards', icon: CreditCard, label: 'Manage Cards', desc: 'Virtual cards & limits', color: 'bg-gold-300/20 text-gold-600', hover: 'hover:bg-gold-300/30' },
            ].map(({ href, icon: Icon, label, desc, color, hover }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-4 p-4 rounded-xl border border-slate-100 ${hover} transition-all group`}>
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display font-semibold text-navy-900">Recent Transactions</h3>
            <p className="text-xs text-slate-400 mt-0.5">{stats?.transactionCount || 0} total transactions</p>
          </div>
          <Link href="/transfers" className="text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1 transition-colors">
            View all
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <ArrowLeftRight size={22} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No transactions yet</p>
            <Link href="/transfers" className="btn-primary mt-4 inline-block text-xs">Make your first transfer</Link>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx, i) => (
              <div key={tx.id}
                className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 font-semibold
                  ${['DEPOSIT', 'TRANSFER_IN', 'REFUND'].includes(tx.type) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">
                    {tx.description || tx.type.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400">{formatRelative(tx.createdAt)}</p>
                    {tx.isFlagged && (
                      <span className="badge badge-red text-[10px] py-0 flex items-center gap-0.5">
                        <AlertTriangle size={9} />Flagged
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold tabular-nums ${getTransactionColor(tx.type)}`}>
                    {getTransactionSign(tx.type)}{formatCurrency(tx.amount)}
                  </p>
                  <span className={`badge text-[10px] mt-0.5 ${getStatusBadge(tx.status)}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
