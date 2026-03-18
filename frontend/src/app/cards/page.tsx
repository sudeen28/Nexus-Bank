'use client';
import { useEffect, useState } from 'react';
import { cardsApi, accountsApi } from '../../lib/api';
import { Card, Account } from '../../types';
import { formatCurrency, formatDate, getStatusBadge, getErrorMessage, maskAccountNumber } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Plus, Eye, EyeOff, Snowflake, Trash2, CreditCard, Zap, ShieldCheck } from 'lucide-react';

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revealedCard, setRevealedCard] = useState<string | null>(null);
  const [newCardData, setNewCardData] = useState<Card | null>(null);
  const [limitModal, setLimitModal] = useState<{ card: Card; value: string } | null>(null);

  const load = async () => {
    try {
      const [cardsRes, accRes] = await Promise.all([cardsApi.getAll(), accountsApi.getAll()]);
      setCards(cardsRes.data.data || []);
      setAccounts(accRes.data.data || []);
    } catch { toast.error('Failed to load cards'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createCard = async () => {
    setCreating(true);
    try {
      const res = await cardsApi.create(accounts[0]?.id);
      const card = res.data.data;
      setNewCardData(card);
      await load();
      toast.success('Virtual card created!');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
    finally { setCreating(false); }
  };

  const handleFreeze = async (card: Card) => {
    try {
      if (card.status === 'ACTIVE') {
        await cardsApi.freeze(card.id);
        toast.success('Card frozen');
      } else if (card.status === 'FROZEN') {
        await cardsApi.unfreeze(card.id);
        toast.success('Card activated');
      }
      await load();
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const handleCancel = async (card: Card) => {
    if (!confirm(`Cancel card ending in ${card.maskedNumber.slice(-4)}? This cannot be undone.`)) return;
    try {
      await cardsApi.cancel(card.id);
      toast.success('Card cancelled');
      await load();
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const handleUpdateLimit = async () => {
    if (!limitModal) return;
    const val = parseFloat(limitModal.value);
    if (isNaN(val) || val < 1 || val > 10000) { toast.error('Limit must be between $1 and $10,000'); return; }
    try {
      await cardsApi.updateLimit(limitModal.card.id, val);
      toast.success('Daily limit updated');
      setLimitModal(null);
      await load();
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const CardVisual = ({ card, fullData }: { card: Card; fullData?: Card | null }) => {
    const isRevealed = revealedCard === card.id && fullData;
    const displayNum = isRevealed && fullData?.cardNumber
      ? fullData.cardNumber.replace(/(.{4})/g, '$1 ').trim()
      : `${card.maskedNumber.replace('****', '**** **** **** ')}`;
    const isFrozen = card.status === 'FROZEN';
    const isCancelled = card.status === 'CANCELLED';

    return (
      <div className={`relative rounded-2xl p-6 text-white overflow-hidden transition-all duration-300
        ${isCancelled ? 'opacity-40 grayscale' : isFrozen ? 'opacity-80' : ''}
        ${card.network === 'VISA' ? 'bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950' : 'bg-gradient-to-br from-slate-700 to-slate-900'}
      `}>
        {/* BG decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-48 h-48 rounded-full bg-white/5 -top-12 -right-12" />
          <div className="absolute w-32 h-32 rounded-full bg-gold-500/10 bottom-0 left-1/4" />
          {isFrozen && (
            <div className="absolute inset-0 bg-blue-900/30 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Snowflake size={32} className="text-blue-300" />
                <span className="text-blue-200 font-semibold text-sm tracking-wide">Card Frozen</span>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          {/* Top row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-white/40 text-xs uppercase tracking-widest mb-1">NexusBank</div>
              <div className="w-10 h-7 rounded bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <div className="w-6 h-4 rounded-sm border border-gold-600/40" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-xs">{card.cardType}</div>
              {card.network === 'VISA' ? (
                <div className="text-white font-bold text-xl italic tracking-tight mt-1">VISA</div>
              ) : (
                <div className="text-white font-bold text-sm mt-1">MASTERCARD</div>
              )}
            </div>
          </div>

          {/* Card number */}
          <div className="font-mono text-lg tracking-[3px] mb-5 text-white/90 card-number">
            {displayNum}
          </div>

          {/* Bottom row */}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Card Holder</div>
              <div className="text-white text-sm font-semibold tracking-wide">{card.cardholderName}</div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Expires</div>
              <div className="text-white text-sm font-mono">
                {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
              </div>
            </div>
            {isRevealed && fullData?.cvv && (
              <div className="text-right ml-4">
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">CVV</div>
                <div className="text-white text-sm font-mono">{fullData.cvv}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-52 rounded-2xl bg-slate-200 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{cards.length} card{cards.length !== 1 ? 's' : ''} · up to 5 allowed</p>
        </div>
        <button onClick={createCard} disabled={creating || cards.filter(c => c.status !== 'CANCELLED').length >= 5}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
          {creating ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</> : <><Plus size={15} />New Virtual Card</>}
        </button>
      </div>

      {/* New card reveal banner */}
      {newCardData && (
        <div className="card border-emerald-200 bg-emerald-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
                <ShieldCheck size={16} />Card Created — Save These Details Now
              </h4>
              <p className="text-xs text-emerald-600 mt-0.5">Full card details shown once only for security</p>
            </div>
            <button onClick={() => setNewCardData(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="max-w-xs">
              <CardVisual card={newCardData} fullData={newCardData} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-emerald-200">
                <span className="text-emerald-700 font-medium">Card Number</span>
                <span className="font-mono text-emerald-900">{newCardData.cardNumber?.replace(/(.{4})/g, '$1 ').trim()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-emerald-200">
                <span className="text-emerald-700 font-medium">CVV</span>
                <span className="font-mono text-emerald-900">{newCardData.cvv}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-emerald-700 font-medium">Expiry</span>
                <span className="font-mono text-emerald-900">{String(newCardData.expiryMonth).padStart(2,'0')}/{String(newCardData.expiryYear).slice(-2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-slate-300" />
          </div>
          <h3 className="font-display font-semibold text-navy-900 mb-1">No cards yet</h3>
          <p className="text-slate-500 text-sm mb-5">Create a virtual card for online payments</p>
          <button onClick={createCard} disabled={creating} className="btn-primary mx-auto inline-flex items-center gap-2 text-sm">
            <Plus size={15} />Create Virtual Card
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cards.map(card => (
            <div key={card.id} className="space-y-4">
              <CardVisual card={card} fullData={revealedCard === card.id ? newCardData : null} />

              {/* Card controls */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</p>
                    <span className={`badge ${getStatusBadge(card.status)} mt-0.5`}>{card.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Daily Limit</p>
                    <button onClick={() => setLimitModal({ card, value: String(card.dailyLimit) })}
                      className="text-sm font-bold text-navy-900 hover:text-navy-600 transition-colors flex items-center gap-1 ml-auto">
                      {formatCurrency(card.dailyLimit)}
                      <span className="text-xs text-slate-400">(edit)</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Created {formatDate(card.createdAt)}
                </div>

                {card.status !== 'CANCELLED' && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleFreeze(card)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all
                        ${card.status === 'FROZEN'
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
                      <Snowflake size={13} />
                      {card.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button onClick={() => handleCancel(card)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all">
                      <Trash2 size={13} />Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Instant Issuance', desc: 'Virtual cards ready in seconds', color: 'text-gold-500' },
          { icon: ShieldCheck, title: 'Freeze Anytime', desc: 'Lock your card instantly if needed', color: 'text-emerald-600' },
          { icon: CreditCard, title: 'Spending Controls', desc: 'Set custom daily spend limits', color: 'text-navy-700' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card flex items-start gap-4 p-4">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Limit modal */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-up">
            <h3 className="font-display font-bold text-navy-900 text-lg mb-1">Update Daily Limit</h3>
            <p className="text-sm text-slate-500 mb-5">Card ending {limitModal.card.maskedNumber.slice(-4)}</p>
            <label className="label">New daily limit (max $10,000)</label>
            <div className="relative mb-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input type="number" min="1" max="10000" className="input pl-7"
                value={limitModal.value}
                onChange={e => setLimitModal(m => m ? { ...m, value: e.target.value } : null)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLimitModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleUpdateLimit} className="btn-primary flex-1">Update Limit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
