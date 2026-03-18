'use client';
import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { AdminStats, User, Transaction } from '../../types';
import { formatCurrency, formatDate, formatRelative, getStatusBadge, getErrorMessage, maskAccountNumber, truncate } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Users, TrendingUp, AlertTriangle, FileCheck, DollarSign,
  Search, RefreshCw, ChevronLeft, ChevronRight, Check, X,
  ShieldOff, ShieldCheck, UserX, UserCheck, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type AdminTab = 'overview' | 'users' | 'transactions' | 'flagged';

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [flagged, setFlagged] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [user]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, page, userSearch, userStatus]);
  useEffect(() => { if (tab === 'transactions') loadTransactions(); }, [tab, page, txStatus]);
  useEffect(() => { if (tab === 'flagged') loadFlagged(); }, [tab]);

  const loadStats = async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data.data);
    } catch { toast.error('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page, limit: 15, search: userSearch || undefined, status: userStatus || undefined });
      setUsers(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTransactions({ page, limit: 15, status: txStatus || undefined });
      setTransactions(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  };

  const loadFlagged = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getFlaggedTransactions();
      setFlagged(res.data.data || []);
    } catch { toast.error('Failed to load flagged transactions'); }
    finally { setLoading(false); }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, { status });
      toast.success(`User ${status.toLowerCase()}`);
      loadUsers();
      setSelectedUser(null);
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const resolveTransaction = async (txId: string, action: 'APPROVE' | 'REVERSE') => {
    try {
      await adminApi.resolveTransaction(txId, action);
      toast.success(`Transaction ${action.toLowerCase()}d`);
      loadFlagged();
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const tabs: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'flagged', label: 'Flagged', icon: AlertTriangle, badge: stats?.flaggedTransactions },
  ];

  const StatCard = ({ title, value, icon: Icon, sub, color }: any) => (
    <div className="card hover:shadow-card-hover transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{title}</p>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-current" />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-navy-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="max-w-7xl space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => { setTab(id); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === id ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon size={14} />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${tab === id ? 'bg-white text-navy-900' : 'bg-red-500 text-white'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats?.totalUsers?.toLocaleString() || '—'} icon={Users} sub={`${stats?.activeUsers || 0} active`} color="bg-navy-50 text-navy-700" />
            <StatCard title="Total Volume" value={stats ? formatCurrency(stats.totalVolume) : '—'} icon={DollarSign} sub="All time" color="bg-emerald-50 text-emerald-600" />
            <StatCard title="Flagged" value={stats?.flaggedTransactions || 0} icon={AlertTriangle} sub="Needs review" color="bg-red-50 text-red-600" />
            <StatCard title="Pending KYC" value={stats?.pendingKyc || 0} icon={FileCheck} sub="Awaiting review" color="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-display font-semibold text-navy-900 mb-5">New Signups (7 days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.signupTrend || []} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0a1f3d', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#0a2540" radius={[5, 5, 0, 0]} name="Signups" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-navy-900 mb-4">Platform Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Transactions', value: stats?.totalTransactions?.toLocaleString() || '—' },
                  { label: 'Platform Revenue (fees)', value: stats ? formatCurrency(stats.totalRevenue) : '—' },
                  { label: 'Active Users', value: stats?.activeUsers?.toLocaleString() || '—' },
                  { label: 'Pending KYC Reviews', value: stats?.pendingKyc || 0 },
                  { label: 'Flagged Transactions', value: stats?.flaggedTransactions || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-bold text-navy-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <div className="card">
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 text-sm" placeholder="Search by name or email..."
                value={userSearch} onChange={e => { setUserSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input w-44 text-sm" value={userStatus} onChange={e => { setUserStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {['ACTIVE','SUSPENDED','FROZEN','PENDING_VERIFICATION'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={loadUsers} className="btn-secondary p-2.5"><RefreshCw size={14} /></button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['User', 'Email', 'Balance', 'Status', 'KYC', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="py-3 px-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                    </td></tr>
                  ))
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-gold-400 text-xs font-bold flex-shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-navy-900 text-xs">{u.firstName} {u.lastName}</p>
                          <p className="text-slate-400 text-[10px]">{u.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{truncate(u.email, 24)}</td>
                    <td className="py-3 px-3 text-xs font-bold text-navy-900 tabular-nums">
                      {u.accounts?.[0] ? formatCurrency(u.accounts[0].balance) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge ${getStatusBadge(u.status)} text-[10px]`}>{u.status}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge ${getStatusBadge(u.kyc?.status || 'NOT_SUBMITTED')} text-[10px]`}>
                        {u.kyc?.status || 'NONE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">{formatDate(u.createdAt, 'MMM d, yy')}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedUser(u)} title="View details"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-navy-100 text-slate-500 hover:text-navy-700 flex items-center justify-center transition-colors">
                          <Eye size={12} />
                        </button>
                        {u.status === 'ACTIVE' ? (
                          <button onClick={() => updateUserStatus(u.id, 'SUSPENDED')} title="Suspend"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors">
                            <UserX size={12} />
                          </button>
                        ) : (
                          <button onClick={() => updateUserStatus(u.id, 'ACTIVE')} title="Activate"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors">
                            <UserCheck size={12} />
                          </button>
                        )}
                        {u.status !== 'FROZEN' ? (
                          <button onClick={() => updateUserStatus(u.id, 'FROZEN')} title="Freeze"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors">
                            <ShieldOff size={12} />
                          </button>
                        ) : (
                          <button onClick={() => updateUserStatus(u.id, 'ACTIVE')} title="Unfreeze"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 flex items-center justify-center transition-colors">
                            <ShieldCheck size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">{total} users total</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-40"><ChevronLeft size={13} /></button>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-600">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < 15}
                className="btn-secondary p-2 disabled:opacity-40"><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab === 'transactions' && (
        <div className="card">
          <div className="flex gap-3 mb-5">
            <select className="input w-52 text-sm" value={txStatus} onChange={e => { setTxStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {['COMPLETED','PENDING','FAILED','REVERSED','FLAGGED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={loadTransactions} className="btn-secondary p-2.5"><RefreshCw size={14} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Reference', 'Type', 'From', 'To', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                )) : transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{tx.referenceId.slice(0,10).toUpperCase()}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-medium text-navy-800 bg-navy-50 px-2 py-0.5 rounded-lg">
                        {tx.type.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {tx.senderAccount?.user ? `${tx.senderAccount.user.firstName} ${tx.senderAccount.user.lastName}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {tx.receiverAccount?.user ? `${tx.receiverAccount.user.firstName} ${tx.receiverAccount.user.lastName}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold text-navy-900 tabular-nums">{formatCurrency(tx.amount)}</td>
                    <td className="py-3 px-3">
                      <span className={`badge ${getStatusBadge(tx.status)} text-[10px]`}>{tx.status}</span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">{formatDate(tx.createdAt, 'MMM d, h:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">{total} transactions total</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary p-2 disabled:opacity-40"><ChevronLeft size={13} /></button>
              <span className="px-3 py-1.5 text-xs font-medium text-slate-600">Page {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={transactions.length < 15}
                className="btn-secondary p-2 disabled:opacity-40"><ChevronRight size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLAGGED ── */}
      {tab === 'flagged' && (
        <div className="space-y-4">
          {flagged.length === 0 && !loading ? (
            <div className="card text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={28} className="text-emerald-500" />
              </div>
              <h3 className="font-display font-semibold text-navy-900 mb-1">No flagged transactions</h3>
              <p className="text-slate-400 text-sm">All transactions are clear</p>
            </div>
          ) : flagged.map(tx => (
            <div key={tx.id} className="card border-l-4 border-l-red-400">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge badge-red flex items-center gap-1 text-xs">
                      <AlertTriangle size={10} />Flagged
                    </span>
                    <span className="text-xs font-mono text-slate-400">{tx.referenceId.slice(0,12).toUpperCase()}</span>
                    <span className="badge badge-yellow text-[10px]">{tx.type.replace(/_/g,' ')}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="text-lg font-display font-bold text-navy-900">{formatCurrency(tx.amount)}</p>
                    </div>
                    {tx.senderAccount?.user && (
                      <div>
                        <p className="text-xs text-slate-500">From</p>
                        <p className="text-sm font-medium text-navy-800">{tx.senderAccount.user.firstName} {tx.senderAccount.user.lastName}</p>
                      </div>
                    )}
                    {tx.receiverAccount?.user && (
                      <div>
                        <p className="text-xs text-slate-500">To</p>
                        <p className="text-sm font-medium text-navy-800">{tx.receiverAccount.user.firstName} {tx.receiverAccount.user.lastName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Date</p>
                      <p className="text-sm text-slate-700">{formatRelative(tx.createdAt)}</p>
                    </div>
                  </div>
                  {tx.flagReason && (
                    <div className="bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                      <p className="text-xs text-red-700 font-medium">Reason: {tx.flagReason}</p>
                    </div>
                  )}
                  {tx.description && (
                    <p className="text-xs text-slate-500">Description: {tx.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => resolveTransaction(tx.id, 'APPROVE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors">
                    <Check size={13} />Approve
                  </button>
                  <button onClick={() => resolveTransaction(tx.id, 'REVERSE')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                    <X size={13} />Reverse
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-up overflow-hidden">
            <div className="bg-navy-900 p-6 text-white">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-lg">User Details</h3>
                <button onClick={() => setSelectedUser(null)} className="text-white/60 hover:text-white">✕</button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-lg">
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-white/60 text-sm">{selectedUser.email}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'User ID', value: selectedUser.id.slice(0, 16) + '...' },
                { label: 'Role', value: selectedUser.role },
                { label: 'Status', value: selectedUser.status },
                { label: 'KYC', value: selectedUser.kyc?.status || 'NOT_SUBMITTED' },
                { label: 'Balance', value: selectedUser.accounts?.[0] ? formatCurrency(selectedUser.accounts[0].balance) : '—' },
                { label: 'Account #', value: selectedUser.accounts?.[0] ? maskAccountNumber(selectedUser.accounts[0].accountNumber) : '—' },
                { label: 'Joined', value: formatDate(selectedUser.createdAt) },
                { label: 'Last login', value: selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-navy-900">{value}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => updateUserStatus(selectedUser.id, selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                  className={`flex-1 btn-${selectedUser.status === 'ACTIVE' ? 'danger' : 'primary'} text-sm py-2`}>
                  {selectedUser.status === 'ACTIVE' ? 'Suspend User' : 'Activate User'}
                </button>
                <button onClick={() => setSelectedUser(null)} className="flex-1 btn-secondary text-sm py-2">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
