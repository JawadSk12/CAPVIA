'use client';

import React, { useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../../services/api';
import { Bell, Check, Trash2, RefreshCw, Mail } from 'lucide-react';

export default function HRNotificationsPage() {
  const queryClient = useQueryClient();

  // Load Notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(),
  });

  const notifications = useMemo(() => {
    return notificationsData?.notifications || notificationsData || [];
  }, [notificationsData]);

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Recruiter Alerts" breadcrumbs={[{ label: 'Workspace' }, { label: 'Notifications' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Recruiter Alert Feeds</h2>
            <p className="text-slate-500 text-xs mt-1">Audit active candidate notifications and integrity telemetry alerts</p>
          </div>
          
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || notifications.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-slate-650 hover:text-[#0D47A1] text-xs font-bold transition-all disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>Mark All as Read</span>
          </button>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Syncing notifications registry...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8">
            <Bell className="h-10 w-10 mx-auto mb-4 text-slate-355" />
            <h3 className="font-bold text-slate-800 text-base">All Clear!</h3>
            <p className="text-xs text-slate-450 mt-1">No pending recruiter alerts found.</p>
          </div>
        ) : (
          <div className="max-w-3xl bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 text-left">
            <div className="space-y-4">
              {notifications.map((notif: any) => (
                <div 
                  key={notif.id} 
                  className={`flex justify-between items-start p-4 rounded-xl border transition-colors ${
                    notif.is_read 
                      ? 'bg-slate-50/50 border-slate-100 opacity-65' 
                      : 'bg-white border-slate-150 shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                      notif.is_read ? 'bg-slate-100 text-slate-450' : 'bg-[#0D47A1]/10 text-[#0D47A1]'
                    }`}>
                      ✉️
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        {notif.title || 'Platform Alert'}
                      </span>
                      <p className="text-slate-500 text-[11px] mt-1 leading-relaxed font-medium">
                        {notif.message || notif.content || 'Report compiled or applicant status moved.'}
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-2 font-semibold">
                        {new Date(notif.created_at || notif.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate(notif.id)}
                      disabled={markReadMutation.isPending}
                      className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-800"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
