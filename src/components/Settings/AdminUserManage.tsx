import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle, Settings as SettingsIcon, ShieldAlert,
  RotateCcw, Key, Send, UserMinus, AlertTriangle, Ban
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

type UserRole = 'member' | 'premium' | 'admin';

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  is_banned?: boolean;
  premium_expires_at?: string | null;
}

interface AdminUserManageProps {
  user: AdminUser;
  onClose: () => void;
  onUpdate: () => void;
  admin: any;
}

type SubTab = 'general' | 'security';

export const AdminUserManage: React.FC<AdminUserManageProps> = ({ user, onClose, onUpdate, admin }) => {
  const { t } = useLanguage();
  const [subTab, setSubTab] = useState<SubTab>('general');

  // General
  const [daysInput, setDaysInput] = useState('30');
  const [expiryDate, setExpiryDate] = useState(
    user.premium_expires_at
      ? new Date(user.premium_expires_at).toISOString().split('T')[0]
      : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Security
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isBanned = !!user.is_banned;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  // ── Add days (negative = subtract) ──
  const handleAddDays = async () => {
    const days = parseInt(daysInput);
    if (!days || days === 0) { toast.error('Enter a valid number of days.'); return; }
    setIsUpdating(true);
    const success = await admin.handleUpdatePremium(user.id, { days });
    if (success) {
      triggerSuccess(
        days > 0
          ? t('toast_days_added', { days: String(days) })
          : t('toast_days_subtracted', { days: String(Math.abs(days)) })
      );
      onUpdate();
    }
    setIsUpdating(false);
  };

  // ── Set exact expiry date ──
  const handleSaveExpiry = async () => {
    setIsUpdating(true);
    const success = await admin.handleUpdatePremium(user.id, { expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined, reset: !expiryDate });
    if (success) {
      triggerSuccess(expiryDate ? t('toast_expiry_saved') : t('toast_expiry_cleared'));
      onUpdate();
    }
    setIsUpdating(false);
  };

  // ── Reset to Free ──
  const handleResetPlan = async () => {
    setIsUpdating(true);
    const success = await admin.handleUpdatePremium(user.id, { reset: true });
    if (success) {
      triggerSuccess(t('toast_plan_reset'));
      setShowResetConfirm(false);
      onUpdate();
    }
    setIsUpdating(false);
  };

  // ── Send password reset email ──
  const handleSendResetEmail = async () => {
    if (!user.email) return;
    setIsUpdating(true);
    const success = await admin.handleResetPassword(user.email);
    if (success) {
      triggerSuccess(t('toast_reset_email_sent'));
    }
    setIsUpdating(false);
  };

  // ── Ban / Unban ──
  const handleBanToggle = async () => {
    setIsUpdating(true);
    const success = await admin.handleToggleBan(user.id, !isBanned);
    if (success) {
      triggerSuccess(
        !isBanned
          ? t('toast_user_banned', { email: user.email })
          : t('toast_user_unbanned', { email: user.email })
      );
      setShowBanConfirm(false);
      onUpdate();
    }
    setIsUpdating(false);
  };

  // ── Delete user ──
  const handleDelete = async () => {
    setIsUpdating(true);
    const success = await admin.handleDeleteUser(user.id, user.email);
    if (success) {
      onUpdate();
      onClose();
    }
    setIsUpdating(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex flex-col relative max-h-[90vh]" style={{ minHeight: 480 }}>

      {/* Success toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[700] bg-emerald-500 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <CheckCircle size={14} />
            <span className="text-[12px] font-semibold">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-input)]/50 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-text-primary">{t('admin_manage_title')}</h2>
          <p className="text-text-muted text-[11px] font-semibold mt-0.5 truncate max-w-[220px]">{user.email}</p>
        </div>
        <button onClick={onClose}
          className="p-2 hover:bg-[var(--bg-input)] rounded-xl text-text-muted border border-[var(--border-color)] transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Sub tabs */}
      <div className="flex bg-[var(--bg-input)] border-b border-[var(--border-color)]">
        {([
          { id: 'general',  icon: SettingsIcon, label: t('admin_tab_general') },
          { id: 'security', icon: ShieldAlert,   label: t('admin_tab_security') },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[11px] font-semibold transition-all ${
              subTab === tab.id ? 'bg-[var(--bg-card)] text-[#a78bfa]' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <tab.icon size={12} /><span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">

          {/* ── GENERAL ── */}
          {subTab === 'general' && (
            <motion.div key="gen" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              className="space-y-5">

              {/* Quick Role Change */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-text-muted block">
                  {t('admin_set_role')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { role: 'member',  label: 'Member',  color: '#94a3b8', bg: '#94a3b815' },
                    { role: 'premium', label: 'Premium', color: '#a78bfa', bg: '#a78bfa15' },
                    { role: 'admin',   label: 'Admin',   color: '#f59e0b', bg: '#f59e0b15' },
                  ] as const).map(r => (
                    <button key={r.role}
                      onClick={async () => {
                        setIsUpdating(true);
                        await admin.handleSetRole(user.id, r.role);
                        setIsUpdating(false);
                        onUpdate();
                      }}
                      disabled={isUpdating || user.role === r.role}
                      className="py-2 rounded-xl text-[11px] font-semibold border transition-all disabled:opacity-40"
                      style={{
                        color: r.color,
                        backgroundColor: user.role === r.role ? r.bg : undefined,
                        borderColor: user.role === r.role ? r.color + '60' : 'var(--border-color)',
                      }}>
                      {r.label}{user.role === r.role ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add premium days */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-text-muted block">
                  {t('admin_add_days_label')}
                </label>
                <p className="text-[9px] text-text-muted -mt-1">
                  {t('admin_add_days_hint')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="number" value={daysInput}
                    onChange={e => setDaysInput(e.target.value)}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#7c6aff]/50 transition-all"
                  />
                  <button onClick={handleAddDays} disabled={isUpdating}
                    className="px-5 bg-[#7c6aff] hover:bg-[#6c5aef] text-white font-black text-[9px] rounded-xl transition-all disabled:opacity-50">
                    {t('admin_add_days_btn')}
                  </button>
                </div>
              </div>

              {/* Set exact expiry date */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-text-muted block">
                  {t('admin_expiry_label')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="date" value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#7c6aff]/50 transition-all"
                  />
                  <button onClick={handleSaveExpiry} disabled={isUpdating}
                    className="px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-text-primary font-black text-[9px] rounded-xl hover:border-[#7c6aff]/50 disabled:opacity-50 transition-all">
                    {t('admin_expiry_save')}
                  </button>
                </div>
                {!expiryDate && <p className="text-[9px] text-text-muted">{t('admin_expiry_none')}</p>}
              </div>

              {/* Reset to Free */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                {!showResetConfirm ? (
                  <button onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] hover:bg-red-500/15 flex items-center justify-center gap-2 transition-all">
                    <RotateCcw size={13} /> {t('admin_reset_plan_btn')}
                  </button>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl space-y-3 text-center">
                    <p className="text-[12px] font-semibold text-text-primary">{t('admin_reset_plan_confirm')}</p>
                    <div className="flex gap-2">
                      <button onClick={handleResetPlan} disabled={isUpdating}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[9px] disabled:opacity-50">
                        {t('btn_confirm')}
                      </button>
                      <button onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-2.5 bg-[var(--bg-input)] text-text-muted rounded-xl font-black text-[9px]">
                        {t('btn_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SECURITY ── */}
          {subTab === 'security' && (
            <motion.div key="sec" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              className="space-y-4">

              {/* Password reset */}
              <button onClick={handleSendResetEmail} disabled={isUpdating}
                className="w-full flex items-center justify-between p-4 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl hover:border-[#7c6aff]/40 disabled:opacity-50 transition-all">
                <div className="flex items-center gap-3">
                  <Key size={14} className="text-[#a78bfa]" />
                  <span className="text-[12px] font-semibold text-text-primary">{t('admin_send_reset_email')}</span>
                </div>
                <Send size={12} className="text-text-muted" />
              </button>

              {/* Ban / Unban */}
              <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Ban size={14} />
                  <h4 className="text-[11px] font-semibold">{t('admin_status_control')}</h4>
                </div>

                {!showBanConfirm ? (
                  <button onClick={() => setShowBanConfirm(true)}
                    className={`w-full py-3 rounded-xl font-black text-[9px] flex items-center justify-center gap-2 border transition-all ${
                      isBanned
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15'
                    }`}>
                    <Ban size={13} />
                    {isBanned ? t('admin_unban_btn') : t('admin_ban_btn')}
                  </button>
                ) : (
                  <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl space-y-3 text-center">
                    <p className="text-[12px] font-semibold text-text-primary leading-relaxed">
                      {isBanned
                        ? t('admin_unban_confirm', { email: user.email })
                        : t('admin_ban_confirm', { email: user.email })}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleBanToggle} disabled={isUpdating}
                        className={`flex-1 py-2.5 text-white rounded-xl font-black text-[9px] disabled:opacity-50 ${
                          isBanned ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'
                        }`}>
                        {t('btn_confirm')}
                      </button>
                      <button onClick={() => setShowBanConfirm(false)}
                        className="flex-1 py-2.5 bg-[var(--bg-input)] text-text-muted rounded-xl font-black text-[9px]">
                        {t('btn_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete user */}
              <div className="pt-3 border-t border-red-500/10 space-y-3">
                <div className="flex items-center gap-2 text-red-500">
                  <ShieldAlert size={14} />
                  <h4 className="text-[11px] font-semibold">{t('admin_critical_zone')}</h4>
                </div>

                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 bg-red-500/5 text-red-400 border border-red-500/20 rounded-xl font-black text-[9px] flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all">
                    <UserMinus size={13} /> {t('admin_delete_account_btn')}
                  </button>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-xl space-y-4 text-center">
                    <AlertTriangle size={28} className="text-red-500 mx-auto" />
                    <p className="text-[12px] font-semibold text-text-primary leading-relaxed">
                      {t('admin_delete_confirm', { email: user.email })}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={isUpdating}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[9px] disabled:opacity-50">
                        {t('btn_confirm')}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 bg-[var(--bg-input)] text-text-muted rounded-xl font-black text-[9px]">
                        {t('btn_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-[var(--bg-input)]/20 border-t border-[var(--border-color)] text-center">
        <p className="text-[10px] font-semibold text-text-muted">{t('admin_session_footer')}</p>
      </div>
    </div>
  );
};