'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AppNotification } from '@/types';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  X,
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    resolveNotificationAction,
    setActiveTab,
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'overdue'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'high' && n.priority !== 'yuksek') return false;
    if (activeFilter === 'overdue' && n.type !== 'task_overdue' && n.type !== 'finance_overdue') return false;
    return true;
  });

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
      onClose();
    }
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'task_overdue':
        return <Clock className="w-4 h-4 text-rose-400" />;
      case 'finance_overdue':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'calendar_upcoming':
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Flyout Panel */}
      <div className="absolute right-0 mt-2 w-96 sm:w-[420px] bg-[#1a1a1a] border border-[#2e2e2e] rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh] animate-fade-in select-none">
        {/* Panel Header */}
        <div className="p-4 border-b border-[#282828] bg-[#161616] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Bildirim & Hatırlatma Merkezi</span>
                {unreadNotificationCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-full">
                    {unreadNotificationCount} Yeni
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-[#71717a]">Gecikmeler, yaklaşan yayınlar ve acil onaylar</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-[#252525] transition-colors flex items-center gap-1"
                title="Tümünü Okundu İşaretle"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tümünü Okundu Say</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-[#71717a] hover:text-white rounded-lg hover:bg-[#252525] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 bg-[#181818] border-b border-[#242424] flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
              activeFilter === 'all' ? 'bg-[#2d5a27] text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            Tümü ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('overdue')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
              activeFilter === 'overdue' ? 'bg-rose-900/80 text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Gecikenler</span>
          </button>
          <button
            onClick={() => setActiveFilter('high')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
              activeFilter === 'high' ? 'bg-amber-900/80 text-white' : 'text-[#888] hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Yüksek Öncelik</span>
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#222]">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71717a] space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[#333]" />
              <p className="text-white font-medium">Harika! Bekleyen acil bildiriminiz yok.</p>
              <p className="text-[11px]">Tüm görevler, takvim etkinlikleri ve finans ödemeleri güncel.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-[#222] transition-colors cursor-pointer space-y-2 relative group ${
                    !notif.isRead ? 'bg-[#1e1e1e]' : 'bg-[#181818]/60 opacity-80'
                  }`}
                >
                  {/* Top Bar: Icon, Title, Priority & Time */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-xl bg-[#242424] border border-[#333] shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#9ca3af] leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 text-[#666] hover:text-rose-400 rounded-lg hover:bg-[#2a2a2a] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Bildirimi Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom: Interactive Action Center Button */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#262626]">
                    <span className="text-[10px] font-mono text-[#666]">
                      {notif.priority === 'yuksek' ? (
                        <span className="text-rose-400 font-bold">🔴 Yüksek Öncelik</span>
                      ) : notif.priority === 'orta' ? (
                        <span className="text-amber-400 font-bold">🟡 Orta Öncelik</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">🟢 Düşük Öncelik</span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {notif.actionType === 'complete_task' && notif.targetId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveNotificationAction(notif.id, 'complete_task', notif.targetId!);
                          }}
                          className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Görevi Tamamla (✓)</span>
                        </button>
                      )}

                      {notif.actionType === 'confirm_finance' && notif.targetId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveNotificationAction(notif.id, 'confirm_finance', notif.targetId!);
                          }}
                          className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>İşlemi Onayla / Öde (✓)</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                        className="px-2 py-1 bg-[#222] hover:bg-[#2c2c2c] text-[#a1a1aa] hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Detaya Git</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
