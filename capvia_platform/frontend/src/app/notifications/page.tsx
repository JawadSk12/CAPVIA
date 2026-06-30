'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { notificationApi } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { Bell, Check, Inbox, RefreshCw, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const NOTIFICATION_ICON = (title: string): string => {
  if (title.includes('Hired') || title.includes('hired')) return '🎊';
  if (title.includes('Shortlisted') || title.includes('shortlisted')) return '🌟';
  if (title.includes('Withdrawn') || title.includes('withdrawn')) return '↩️';
  if (title.includes('Submitted') || title.includes('submitted')) return '📨';
  if (title.includes('Update') || title.includes('update')) return '📋';
  return '🔔';
};

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={['candidate', 'hr', 'admin']}>
      <UnifiedLayout title="Notifications">
        <NotificationsContent />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const PER_PAGE = 20;

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationApi.list({ page, per_page: PER_PAGE, unread_only: unreadOnly });
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setUnreadCount(data.unread_count || 0);
    } finally {
      setIsLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    await notificationApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setIsMarkingAll(false);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* Control panel card */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inbox Telemetry</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-[10px] font-bold rounded-full text-white">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-405 mt-1 font-semibold">{total} total alerts received</p>
        </div>

        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border",
              unreadOnly 
                ? "bg-blue-50/80 border-blue-100 text-[#0D47A1]" 
                : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
            )}
          >
            {unreadOnly ? '● Unread Alerts Only' : '○ All Alerts'}
          </button>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAll} 
              disabled={isMarkingAll}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/50 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking...' : 'Mark All Read'}
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm min-h-[400px]">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400 text-xs font-medium">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Fetching alerts…
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="text-5xl mb-4 bg-slate-50 p-4 rounded-full w-fit mx-auto">🔔</div>
            <h3 className="font-bold text-slate-700 text-sm">No notifications found</h3>
            <p className="text-slate-400 text-xs mt-1">
              {unreadOnly ? 'You have no unread notification alerts.' : 'All caught up! No notifications received yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  "p-4 border rounded-2xl flex gap-4 items-start transition-all duration-200 group relative",
                  n.is_read 
                    ? "border-slate-100 bg-white" 
                    : "border-[#0D47A1]/20 bg-[#0D47A1]/5/10" // soft primary glow for unread
                )}
                style={{
                  backgroundColor: !n.is_read ? 'rgba(13, 71, 161, 0.03)' : undefined
                }}
              >
                {/* Icon wrapper */}
                <div className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0",
                  n.is_read ? "bg-slate-50 text-slate-550 border border-slate-100" : "bg-[#0D47A1]/10 text-[#0D47A1] border border-[#0D47A1]/20"
                )}>
                  {NOTIFICATION_ICON(n.title)}
                </div>

                {/* Content block */}
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={clsx(
                      "text-sm tracking-tight",
                      n.is_read ? "text-slate-700 font-semibold" : "text-slate-900 font-black"
                    )}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-slate-450 mt-1 leading-relaxed font-medium">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1">
                    <span>⏱</span>
                    <span>
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>

                {/* Quick mark read button */}
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-450 hover:text-slate-700 shadow-sm transition-all duration-200 shrink-0"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-3 pt-6 mt-6 border-t border-slate-100">
            <button 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-400 font-bold">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
