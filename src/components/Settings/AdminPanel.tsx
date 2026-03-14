import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CreditCard, Star, Crown, Ban, Calendar, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { AdminPaymentManage } from './AdminPaymentManage';
import { AdminUserManage, AdminUser } from './AdminUserManage';

type UserRole = 'member' | 'premium' | 'admin';
type AdminTab = 'users' | 'payments';

interface AdminPanelProps {
  admin: any;
  currentUserEmail: string;
  pendingPaymentCount?: number;
}

const ROLE_STYLE: Record<UserRole, { color: string; bg: string; icon: React.ReactNode }> = {
  member:  { color: '#94a3b8', bg: '#94a3b815', icon: <User size={9} /> },
  premium: { color: '#a78bfa', bg: '#a78bfa15', icon: <Star size={9} /> },
  admin:   { color: '#f59e0b', bg: '#f59e0b15', icon: <Crown size={9} /> },
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  admin,
  currentUserEmail,
  pendingPaymentCount = 0,
}) => {
  const { pendingUsers, userStats } = admin;
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [userSearch, setUserSearch] = useState('');
  const [managingUser, setManagingUser] = useState<AdminUser | null>(null);
  const [dashboardToast, setDashboardToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setDashboardToast(msg);
    setTimeout(() => setDashboardToast(null), 3000);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return pendingUsers;
    return pendingUsers.filter((u: AdminUser) => u.email.toLowerCase().includes(q));
  }, [pendingUsers, userSearch]);

  return (
    <>
      {/* Global toast */}
      <AnimatePresence>
        {dashboardToast && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -16, x: '-50%' }}
            className="fixed top-8 left-1/2 z-[500] bg-[#7c6aff] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-none"
          >
            <CheckCircle size={15} />
            <span className="text-[12px] font-semibold">{dashboardToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-4 p-1 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-[var(--bg-card)] text-[#a78bfa] shadow'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <User size={11} className="inline mr-1" />{t('admin_tab_users')}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all relative ${
            activeTab === 'payments'
              ? 'bg-[var(--bg-card)] text-[#a78bfa] shadow'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <CreditCard size={11} className="inline mr-1" />{t('admin_tab_payments')}
          {pendingPaymentCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
              {pendingPaymentCount}
            </span>
          )}
        </button>
      </div>

      {/* ══ USERS TAB ══ */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('admin_col_members'), color: '#94a3b8', count: pendingUsers.filter((u: AdminUser) => u.role === 'member').length },
              { label: t('admin_col_premium'), color: '#a78bfa', count: pendingUsers.filter((u: AdminUser) => u.role === 'premium').length },
              { label: t('admin_col_admins'),  color: '#f59e0b', count: pendingUsers.filter((u: AdminUser) => u.role === 'admin').length },
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-center">
                <div className="text-xl font-black" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[9px] text-text-muted font-semibold mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder={t('admin_search_placeholder')}
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c6aff]/50 transition-all"
          />

          {/* User list */}
          <div className="rounded-xl border border-[var(--border-color)] overflow-visible">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-xs italic">{t('admin_no_users')}</div>
            ) : filteredUsers.map((u: AdminUser, idx: number) => {
              const isSelf = u.email === currentUserEmail;
              const style = ROLE_STYLE[u.role as UserRole];
              return (
                <div key={u.id}
                  className={`flex items-center justify-between px-3 py-3 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-input)]/40 transition-colors ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-text-primary truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {isSelf && (
                        <span className="text-[8px] bg-[#7c6aff]/15 text-[#a78bfa] font-bold px-1.5 py-0.5 rounded-full">
                          {t('admin_badge_you')}
                        </span>
                      )}
                      {/* Role badge */}
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{ color: style.color, backgroundColor: style.bg }}>
                        {style.icon}
                        <span className="capitalize">{u.role}</span>
                      </span>
                      {/* Banned badge */}
                      {u.is_banned && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ color: '#ef4444', backgroundColor: '#ef444415' }}>
                          <Ban size={8} />{t('admin_banned_badge')}
                        </span>
                      )}
                      {/* Expiry badge */}
                      {u.premium_expires_at && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                          style={{ color: '#a78bfa', backgroundColor: '#a78bfa10' }}>
                          <Calendar size={8} />{fmt(u.premium_expires_at)}
                        </span>
                      )}
                      {/* Entry count badge */}
                      {userStats[u.id] && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: '#64748b', backgroundColor: '#64748b15' }}>
                          {userStats[u.id].count} {t('admin_entries_count')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isSelf && (
                    <button
                      onClick={() => setManagingUser(u)}
                      className="ml-3 px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[11px] font-semibold text-text-muted hover:text-text-primary hover:border-[#7c6aff]/40 transition-all shrink-0"
                    >
                      {t('admin_manage_btn')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ PAYMENTS TAB ══ */}
      {activeTab === 'payments' && (
        <AdminPaymentManage onToast={triggerToast} admin={admin} />
      )}

      {/* ══ MANAGE USER MODAL ══ */}
      <AnimatePresence>
        {managingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setManagingUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <AdminUserManage
                user={managingUser}
                onClose={() => setManagingUser(null)}
                admin={admin}
                onUpdate={() => {
                  setManagingUser(null);
                  triggerToast(t('admin_user_updated_toast'));
                  admin.fetchPendingUsers();
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};