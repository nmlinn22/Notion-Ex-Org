import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Crown, X, AlertTriangle, MoreHorizontal, Search, Star, User } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

type UserRole = 'member' | 'premium' | 'admin';

interface AdminPanelProps {
  pendingUsers: any[];
  userStats: Record<string, { count: number; last_active: string }>;
  handleSetRole: (userId: string, role: UserRole) => void;
  handleDeleteUser: (userId: string, userEmail: string) => void;
  currentUserEmail: string;
}

type ConfirmAction =
  | { type: 'delete'; userId: string; userEmail: string }
  | null;

const ROLE_CONFIG_DEF = {
  member:  { color: '#94a3b8', bg: '#94a3b815', icon: <User size={10} /> },
  premium: { color: '#a78bfa', bg: '#a78bfa15', icon: <Star size={10} /> },
  admin:   { color: '#f59e0b', bg: '#f59e0b15', icon: <Crown size={10} /> },
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  pendingUsers,
  userStats,
  handleSetRole,
  handleDeleteUser,
  currentUserEmail
}) => {
  const { t } = useLanguage();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    member:  { label: t('role_member'),  ...ROLE_CONFIG_DEF.member },
    premium: { label: t('role_premium'), ...ROLE_CONFIG_DEF.premium },
    admin:   { label: t('role_admin'),   ...ROLE_CONFIG_DEF.admin },
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const getStats = (userId: string) => userStats[userId] || { count: 0, last_active: null };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return pendingUsers;
    return pendingUsers.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
  }, [pendingUsers, search]);

  const getRoleBadge = (user: any) => {
    const role: UserRole = user.role || (user.is_admin ? 'admin' : 'member');
    const cfg = ROLE_CONFIG[role];
    return (
      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
        style={{ color: cfg.color, backgroundColor: cfg.bg }}>
        {cfg.icon}{cfg.label}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-xl font-black text-[#94a3b8]">{pendingUsers.filter(u => (u.role || 'member') === 'member').length}</div>
            <div className="text-[9px] text-text-muted font-semibold mt-0.5">{t('admin_col_members')}</div>
          </div>
          <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-xl font-black text-[#a78bfa]">{pendingUsers.filter(u => u.role === 'premium').length}</div>
            <div className="text-[9px] text-text-muted font-semibold mt-0.5">{t('admin_col_premium')}</div>
          </div>
          <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-xl font-black text-[#f59e0b]">{pendingUsers.filter(u => u.role === 'admin' || u.is_admin).length}</div>
            <div className="text-[9px] text-text-muted font-semibold mt-0.5">{t('admin_col_admins')}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input type="text" placeholder={t('admin_search_placeholder')} value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7c6aff]/50 transition-all" />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[var(--border-color)] overflow-visible">
          <div className="grid grid-cols-[1fr_44px] bg-[var(--bg-input)] border-b border-[var(--border-color)]">
            {[t('admin_col_email'), ''].map((col, i) => (
              <div key={i} className={`px-3 py-2.5 text-[9px] font-black text-text-muted uppercase tracking-widest ${i > 0 ? 'text-center' : ''}`}>{col}</div>
            ))}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-xs italic">{t('admin_no_users')}</div>
          ) : filteredUsers.map((u, idx) => {
            const isNearBottom = idx >= filteredUsers.length - 2;
            const isSelf = u.email === currentUserEmail;
            const stats = getStats(u.id);
            const isOpen = openActionId === u.id;
            const currentRole: UserRole = u.role || (u.is_admin ? 'admin' : 'member');

            return (
              <div key={u.id} className={`grid grid-cols-[1fr_44px] border-b border-[var(--border-color)] last:border-b-0 transition-colors hover:bg-[var(--bg-input)]/40 ${idx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>
                {/* Email + role badge */}
                <div className="px-3 py-3 flex flex-col justify-center min-w-0">
                  <span className="text-[11px] font-semibold text-text-primary truncate">{u.email}</span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isSelf && <span className="text-[8px] bg-[#7c6aff]/15 text-[#a78bfa] font-bold px-1.5 py-0.5 rounded-full">{t('admin_badge_you')}</span>}
                    {getRoleBadge(u)}
                  </div>
                </div>

                {/* Action menu */}
                <div className="flex items-center justify-center relative">
                  {!isSelf && (
                    <>
                      <button onClick={() => setOpenActionId(isOpen ? null : u.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[var(--bg-card)] transition-all">
                        <MoreHorizontal size={15} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setOpenActionId(null)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.1 }}
                              className={`absolute right-0 w-52 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[101] overflow-hidden ${isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                            >
                              {/* User info */}
                              <div className="px-3 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                                <div className="text-[9px] text-text-muted font-semibold uppercase tracking-wider mb-1.5">{t('admin_user_info')}</div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-text-muted">{t('admin_entries_label')}</span>
                                  <span className="font-bold text-text-primary">{stats.count}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] mt-1">
                                  <span className="text-text-muted">{t('admin_last_active')}</span>
                                  <span className="font-bold text-text-primary">{stats.last_active ? formatDate(stats.last_active) : '—'}</span>
                                </div>
                              </div>

                              {/* Role selector */}
                              <div className="px-3 py-2.5 border-b border-[var(--border-color)]">
                                <div className="text-[9px] text-text-muted font-semibold uppercase tracking-wider mb-2">{t('admin_set_role')}</div>
                                <div className="flex gap-1.5">
                                  {(['member', 'premium', 'admin'] as UserRole[]).map(role => {
                                    const cfg = ROLE_CONFIG[role];
                                    const isActive = currentRole === role;
                                    return (
                                      <button key={role}
                                        onClick={() => { handleSetRole(u.id, role); setOpenActionId(null); }}
                                        className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all flex flex-col items-center gap-0.5"
                                        style={{
                                          backgroundColor: isActive ? cfg.bg : 'var(--bg-input)',
                                          color: isActive ? cfg.color : 'var(--text-muted)',
                                          border: isActive ? `1px solid ${cfg.color}40` : '1px solid var(--border-color)'
                                        }}>
                                        {cfg.icon}
                                        {cfg.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Delete */}
                              <div className="py-1">
                                <button onClick={() => { setOpenActionId(null); setConfirmAction({ type: 'delete', userId: u.id, userEmail: u.email }); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] hover:bg-red-500/10 transition-colors text-left text-red-400">
                                  <Trash2 size={13} className="shrink-0" /> {t('admin_delete_account_btn')}
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
              <button onClick={() => setConfirmAction(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors">
                <X size={18} />
              </button>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-text-primary">{t('btn_delete')}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    <span className="font-semibold text-text-primary">"{confirmAction.userEmail}"</span> — {t('admin_delete_confirm', { email: confirmAction.userEmail })}
                  </p>
                </div>
                <div className="w-full flex gap-2 pt-1">
                  <button onClick={() => setConfirmAction(null)} className="flex-1 h-11 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold text-sm hover:text-text-primary transition-all">
                    {t('btn_cancel')}
                  </button>
                  <button
                    onClick={() => { handleDeleteUser(confirmAction.userId, confirmAction.userEmail); setConfirmAction(null); }}
                    className="flex-1 h-11 rounded-xl text-white font-bold text-sm bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                    {t('btn_delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};