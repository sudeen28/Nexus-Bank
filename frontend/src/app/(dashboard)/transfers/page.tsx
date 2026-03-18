'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { transactionsApi, accountsApi } from '../../lib/api';
import { formatCurrency, formatDate, formatRelative, getTransactionColor, getTransactionSign, getTransactionIcon, getStatusBadge, getErrorMessage, maskAccountNumber, truncate } from '../../lib/utils';
import { Transaction, Account, Pagination } from '../../types';
import toast from 'react-hot-toast';
import { Search, Filter, ArrowLeftRight, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, X } from 'lucide-react';

type Tab = 'history' | 'send' | 'deposit' | 'withdraw';

export default function TransfersPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'history';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Form states
  const [sendForm, setSendForm] = useState({ senderAccountId: '', receiverAccountNumber: '', amount: '', description: '' });
  const [depositForm, setDepositForm] = useState({ accountId: '', amount: '' });
  const [withdrawForm, setWithdrawForm] = useState({ accountId: '', amount: '', description: '' });

  useEffect(() => {
    accountsApi.getAll().then(r => {
      const accs = r.data.data || [];
      setAccounts(accs);
      if (accs.length) {
        setSendForm(f => ({ ...f, senderAccountId: accs[0].id }));
        setDepositForm(f => ({ ...f, accountId: accs[0].id }));
        setWithdrawForm(f => ({ ...f, accountId: accs[0].id }));
      }
    });
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const res = await transactionsApi.getAll(params);
      setTransactions(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (e) { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { if (tab === 'history') loadTransactions(); }, [tab, loadTransactions]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendForm.senderAccountId || !sendForm.receiverAccountNumber || !sendForm.amount) {
      toast.error('Please fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      await transactionsApi.transfer({ ...sendForm, amount: parseFloat(sendForm.amount) });
      toast.success('Transfer sent successfully!');
      setSendForm(f => ({ ...f, receiverAccountNumber: '', amount: '', description: '' }));
      setTab('history');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositForm.amount || parseFloat(depositForm.amount) < 1) { toast.error('Minimum deposit is $1.00'); return; }
    setSubmitting(true);
    try {
      await transactionsApi.deposit({ ...depositForm, amount: parseFloat(depositForm.amount), stripePaymentMethodId: 'pm_card_visa' });
      toast.success(`$${depositForm.amount} deposited successfully!`);
      setDepositForm(f => ({ ...f, amount: '' }));
      setTab('history');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) < 0.01) { toast.error('Invalid amount'); return; }
    setSubmitting(true);
    try {
      await transactionsApi.withdraw({ ...withdrawForm, amount: parseFloat(withdrawForm.amount) });
      toast.success('Withdrawal processed!');
      setWithdrawForm(f => ({ ...f, amount: '', description: '' }));
      setTab('history');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setSubmitting(false); }
  };

  const resetFilters = () => setFilters({ search: '', type: '', status: '', startDate: '', endDate: '' });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'history', label: 'History', icon: ArrowLeftRight },
    { id: 'send', label: 'Send Money', icon: ArrowLeftRight },
    { id: 'deposit', label: 'Deposit', icon: TrendingUp },
    { id: 'withdraw', label: 'Withdraw', icon: TrendingDown },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === id ? 'bg-navy-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* HISTORY */}
      {tab === 'history' && (
        <div className="card">
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 text-sm" placeholder="Search by description or reference..."
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 text-sm ${Object.values(filters).some(v => v) ? 'border-navy-300 text-navy-700' : ''}`}>
              <Filter size={14} />
              Filters
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-xs flex items-center justify-center">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </button>
            <button onClick={loadTransactions} className="btn-secondary p-2.5">
              <RefreshCw size={14} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="label">Type</label>
                <select className="input text-sm" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                  <option value="">All types</option>
                  {['DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','CARD_PAYMENT','REFUND'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input text-sm" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  {['COMPLETED','PENDING','FAILED','REVERSED','FLAGGED'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">From date</label>
                <input type="date" className="input text-sm" value={filters.startDate}
                  onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">To date</label>
                <input type="date" className="input text-sm" value={filters.endDate}
                  onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="col-span-full flex justify-end">
                <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <X size={12} />Clear all filters
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="h-4 bg-slate-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No transactions found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-semibold
                      ${['DEPOSIT','TRANSFER_IN','REFUND'].includes(tx.type) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy-900 truncate">
                          {truncate(tx.description || tx.type.replace(/_/g, ' '), 40)}
                        </p>
                        {tx.isFlagged && (
                          <span className="badge badge-red text-[10px] flex items-center gap-0.5 flex-shrink-0">
                            <AlertTriangle size={9} />Flagged
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(tx.createdAt)}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400 font-mono">{tx.referenceId.slice(0,8).toUpperCase()}</span>
                        <span className={`badge ${getStatusBadge(tx.status)} text-[10px] py-0`}>{tx.status}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 tabular-nums">
                      <p className={`text-sm font-bold ${getTransactionColor(tx.type)}`}>
                        {getTransactionSign(tx.type)}{formatCurrency(tx.amount)}
                      </p>
                      {Number(tx.fee) > 0 && (
                        <p className="text-xs text-slate-400">Fee: {formatCurrency(tx.fee)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    Showing {((page - 1) * 12) + 1}–{Math.min(page * 12, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev}
                      className="btn-secondary p-2 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const p = i + 1;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${page === p ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          {p}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
                      className="btn-secondary p-2 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SEND MONEY */}
      {tab === 'send' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                <ArrowLeftRight size={18} className="text-navy-700" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-900">Send Money</h3>
                <p className="text-xs text-slate-400">Internal bank transfer</p>
              </div>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="label">From account</label>
                <select className="input text-sm" value={sendForm.senderAccountId}
                  onChange={e => setSendForm(f => ({ ...f, senderAccountId: e.target.value }))}>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {maskAccountNumber(a.accountNumber)} — {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Recipient account number</label>
                <input className="input text-sm font-mono tracking-wider" placeholder="10-digit account number"
                  maxLength={10} value={sendForm.receiverAccountNumber}
                  onChange={e => setSendForm(f => ({ ...f, receiverAccountNumber: e.target.value.replace(/\D/g, '') }))} />
              </div>
              <div>
                <label className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                  <input type="number" min="0.01" step="0.01" className="input pl-7 text-sm"
                    placeholder="0.00" value={sendForm.amount}
                    onChange={e => setSendForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Description <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input className="input text-sm" placeholder="What's this for?"
                  value={sendForm.description}
                  onChange={e => setSendForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
                {submitting ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Processing...</span> : 'Send Transfer →'}
              </button>
            </form>
          </div>
          <div className="space-y-3">
            <div className="card bg-amber-50 border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">⚡ Transfer Info</h4>
              <ul className="space-y-1.5 text-xs text-amber-700">
                <li>• Transfers process instantly between NexusBank accounts</li>
                <li>• Transactions over $1,000 may incur a $0.50 fee</li>
                <li>• Large or unusual transfers may be flagged for review</li>
                <li>• Daily limit: {formatCurrency(accounts[0]?.dailyLimit || 10000)}</li>
              </ul>
            </div>
            {accounts.length > 0 && (
              <div className="card">
                <h4 className="text-sm font-semibold text-navy-900 mb-3">Your accounts</h4>
                {accounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs font-mono text-slate-600">{maskAccountNumber(a.accountNumber)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.accountType} · {a.currency}</p>
                    </div>
                    <p className="text-sm font-bold text-navy-900">{formatCurrency(a.balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEPOSIT */}
      {tab === 'deposit' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-900">Deposit Funds</h3>
                <p className="text-xs text-slate-400">Add money via card (Stripe test mode)</p>
              </div>
            </div>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="label">Deposit to</label>
                <select className="input text-sm" value={depositForm.accountId}
                  onChange={e => setDepositForm(f => ({ ...f, accountId: e.target.value }))}>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {maskAccountNumber(a.accountNumber)} — {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <input type="number" min="1" max="50000" step="0.01" className="input pl-7 text-sm"
                    placeholder="0.00" value={depositForm.amount}
                    onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map(amt => (
                  <button key={amt} type="button" onClick={() => setDepositForm(f => ({ ...f, amount: String(amt) }))}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${depositForm.amount === String(amt) ? 'bg-navy-900 text-white border-navy-900' : 'border-slate-200 text-slate-600 hover:border-navy-300'}`}>
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold mb-2">Test Card (Stripe)</p>
                <p className="text-xs font-mono text-slate-700">4242 4242 4242 4242</p>
                <p className="text-xs text-slate-500 mt-0.5">Any future date · Any 3-digit CVC</p>
              </div>
              <button type="submit" disabled={submitting} className="btn-gold w-full py-3 text-sm">
                {submitting ? 'Processing...' : `Deposit ${depositForm.amount ? formatCurrency(depositForm.amount) : 'Funds'} →`}
              </button>
            </form>
          </div>
          <div className="card bg-emerald-50 border-emerald-200 h-fit">
            <h4 className="text-sm font-semibold text-emerald-800 mb-3">💳 Deposit Info</h4>
            <ul className="space-y-2 text-xs text-emerald-700">
              <li>• Deposits via Stripe are processed instantly in test mode</li>
              <li>• Maximum single deposit: $50,000</li>
              <li>• No fees on deposits</li>
              <li>• Funds are available immediately upon confirmation</li>
            </ul>
          </div>
        </div>
      )}

      {/* WITHDRAW */}
      {tab === 'withdraw' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-900">Withdraw Funds</h3>
                <p className="text-xs text-slate-400">Withdraw from your account</p>
              </div>
            </div>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="label">From account</label>
                <select className="input text-sm" value={withdrawForm.accountId}
                  onChange={e => setWithdrawForm(f => ({ ...f, accountId: e.target.value }))}>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {maskAccountNumber(a.accountNumber)} — {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <input type="number" min="0.01" step="0.01" className="input pl-7 text-sm"
                    placeholder="0.00" value={withdrawForm.amount}
                    onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <input className="input text-sm" placeholder="Purpose of withdrawal"
                  value={withdrawForm.description}
                  onChange={e => setWithdrawForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button type="submit" disabled={submitting} className="btn-danger w-full py-3">
                {submitting ? 'Processing...' : 'Withdraw →'}
              </button>
            </form>
          </div>
          <div className="card bg-red-50 border-red-200 h-fit">
            <h4 className="text-sm font-semibold text-red-800 mb-3">⚠️ Withdrawal Info</h4>
            <ul className="space-y-2 text-xs text-red-700">
              <li>• You cannot withdraw more than your available balance</li>
              <li>• Large withdrawals may trigger a fraud review</li>
              <li>• Daily withdrawal limit applies per account</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
