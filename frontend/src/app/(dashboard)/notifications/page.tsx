'use client';
import { useEffect, useState } from 'react';
import { notificationsApi } from '../../lib/api';
import { Notification } from '../../types';
import { formatRelative, getErrorMessage } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Trash2, ArrowLeftRight, Shield, Settings, Tag, FileCheck } from 'lucide-react';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  TRANSACTION: { icon: ArrowLeftRight, color: 'text-navy-700', bg: 'bg-navy-50' },
  SECURITY: { icon: Shield, color: 'text-red-600', bg: 'bg-red-50' },
  SYSTEM: { icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' },
  PROMOTION: { icon: Tag, color: 'text-gold-600', bg: 'bg-gold-300/20' },
  KYC: { icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = async (pg = 1, filterVal = filter) => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll({ page: pg, limit: 20, unreadOnly: filterVal === 'unread' });
      const data = res.data;
      setNotifications(pg === 1 ? data.data : prev => [...prev, ...data.data]);
      setUnreadCount(data.unreadCount || 0);
      setHasMore(data.pagination?.hasNext || false);
      setPage(pg);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, filter); }, [filter]);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  const deleteNotif = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      setNotifications(ns => ns.filter(n => n.id !== id));
    } catch (e: any) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize flex items-center gap-1.5 ${
                filter === f ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${filter === 'unread' ? 'bg-white text-navy-900' : 'bg-navy-900 text-white'}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="btn-secondary flex items-center gap-1.5 text-sm">
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse flex gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bell size={24} className="text-slate-300" />
          </div>
          <h3 className="font-display font-semibold text-navy-900 mb-1">
            {filter === 'unread' ? 'All caught up!' : 'No notifications'}
          </h3>
          <p className="text-slate-400 text-sm">
            {filter === 'unread' ? 'No unread notifications' : "You don't have any notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const cfg = typeConfig[notif.type] || typeConfig.SYSTEM;
            const Icon = cfg.icon;
            return (
              <div key={notif.id}
                className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-sm
                  ${notif.isRead ? 'bg-white border-slate-100' : 'bg-navy-950/[0.02] border-navy-100'}`}
                onClick={() => !notif.isRead && markRead(notif.id)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={17} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold leading-snug ${notif.isRead ? 'text-navy-700' : 'text-navy-900'}`}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.isRead && (
                        <button onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-navy-100 flex items-center justify-center text-slate-500 hover:text-navy-700 transition-colors"
                          title="Mark read">
                          <CheckCheck size={12} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center text-slate-500 hover:text-red-600 transition-colors"
                        title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">{formatRelative(notif.createdAt)}</span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-navy-900 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button onClick={() => load(page + 1)}
              className="btn-secondary w-full py-3 text-sm">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
