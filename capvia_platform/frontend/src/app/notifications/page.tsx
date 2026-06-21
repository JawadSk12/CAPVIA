'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { notificationApi } from '../../services/api';
import ProtectedRoute from '../../components/ProtectedRoute';

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
      <NotificationsContent />
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

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/applications" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Applications</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span style={{ background: '#a78bfa', color: '#fff', fontSize: '12px', fontWeight: 800, padding: '2px 9px', borderRadius: '20px' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>{total} total notifications</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
            style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${unreadOnly ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.12)'}`, background: unreadOnly ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.05)', color: unreadOnly ? '#a78bfa' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
          >
            {unreadOnly ? '● Unread Only' : '○ All'}
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} disabled={isMarkingAll}
              style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', cursor: isMarkingAll ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '13px' }}>
              {isMarkingAll ? 'Marking...' : 'Mark All Read'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 40px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.35)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.6)', fontSize: '18px' }}>
              {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>Activity updates will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{ background: n.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(167,139,250,0.06)', border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.07)' : 'rgba(167,139,250,0.2)'}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s ease' }}
              >
                {/* Icon */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: n.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {NOTIFICATION_ICON(n.title)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: n.is_read ? 500 : 700, color: n.is_read ? 'rgba(255,255,255,0.7)' : '#fff' }}>{n.title}</p>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{n.message}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>
                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: '6px', boxShadow: '0 0 8px rgba(167,139,250,0.6)' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '28px', alignItems: 'center' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === 1 ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>
              ← Prev
            </button>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '0 12px' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: page === totalPages ? 'rgba(255,255,255,0.25)' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
