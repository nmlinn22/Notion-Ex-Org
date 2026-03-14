import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Trash2, X, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { Session } from '@supabase/supabase-js';
import { useLanguage } from '../lib/LanguageContext';

interface NotificationBellProps {
  session: Session | null;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ session }) => {
  const { t } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(session);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom + 10);
    }
    setIsOpen(prev => !prev);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      default: return <Info size={14} className="text-blue-400" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed right-3 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl z-[200] overflow-hidden"
            style={{
              width: 'min(320px, calc(100vw - 24px))',
              top: dropdownTop,
            }}
          >
            {/* Caret arrow pointing to bell */}
            <div
              className="absolute -top-2 right-3 w-4 h-4 rotate-45 bg-[var(--bg-card)] border-l border-t border-[var(--border-color)]"
            />

            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-input)]/50">
              <h3 className="text-sm font-bold text-text-primary">{t('notification_title')}</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-[#a78bfa] hover:underline"
                >
                  {t('notification_mark_all')}
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-input)] flex items-center justify-center mx-auto mb-3">
                    <Bell size={20} className="text-text-muted/30" />
                  </div>
                  <p className="text-sm text-text-muted">{t('notification_empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {notifications.map((noti) => {
                    const isExpanded = expandedId === noti.id;
                    return (
                    <div
                      key={noti.id}
                      onClick={() => {
                        setExpandedId(isExpanded ? null : noti.id);
                        if (!noti.is_read) markAsRead(noti.id);
                      }}
                      className={`p-4 transition-colors cursor-pointer hover:bg-[var(--bg-hover)] ${!noti.is_read ? 'bg-[#7c6aff]/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getIcon(noti.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`text-xs font-semibold ${!noti.is_read ? 'text-text-primary' : 'text-text-muted'}`}>
                              {noti.title}
                            </p>
                            <span className="text-[10px] text-text-muted shrink-0">{getTimeAgo(noti.created_at)}</span>
                          </div>
                          <motion.p
                            animate={{ height: 'auto' }}
                            className={`text-xs text-text-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
                          >
                            {noti.message}
                          </motion.p>
                          {!isExpanded && noti.message.length > 80 && (
                            <p className="text-[10px] text-[#a78bfa] mt-1 font-semibold">
                              {t('notification_tap_to_read')}
                            </p>
                          )}
                        </div>
                        {!noti.is_read && (
                          <div className="w-2 h-2 rounded-full bg-[#7c6aff] mt-1 shrink-0" />
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-[var(--bg-input)]/30 border-t border-[var(--border-color)] text-center">
              <p className="text-[10px] text-text-muted">{t('notification_recent')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};