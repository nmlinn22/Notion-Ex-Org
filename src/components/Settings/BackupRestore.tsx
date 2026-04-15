import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, AlertTriangle, X, RefreshCw, Trash2, RotateCcw, Save } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/LanguageContext';

interface Backup {
  id: string;
  label: string;
  entries_count: number;
  created_at: string;
}

interface BackupRestoreProps {
  session: Session;
  userRole: string;
  isAdmin: boolean;
  onOpenPremium?: () => void;
}

type ConfirmAction =
  | { type: 'restore'; backup: Backup; mode: 'merge' | 'replace' }
  | { type: 'delete'; backup: Backup }
  | null;

export const BackupRestore: React.FC<BackupRestoreProps> = ({
  session, userRole, isAdmin, onOpenPremium,
}) => {
  const { t } = useLanguage();
  const isPremium = isAdmin || userRole === 'premium' || userRole === 'admin';

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/backups`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setBackups(data);
    } catch {
      toast.error(t('toast_backup_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPremium) loadBackups();
    else setLoading(false);
  }, [isPremium]);

  const handleCreateBackup = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${window.location.origin}/api/backups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed.');
      toast.success(t('toast_backup_saved', { count: data.backup.entries_count }));
      setBackups(prev => [data.backup, ...prev]);
    } catch (err: any) {
      toast.error(t('toast_backup_failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmAction || confirmAction.type !== 'restore') return;
    setIsActioning(true);
    setConfirmAction(null);
    try {
      const res = await fetch(
        `${window.location.origin}/api/backups/${confirmAction.backup.id}/restore`,
        { method: 'POST', headers, body: JSON.stringify({ mode: confirmAction.mode }) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed.');
      toast.success(t('toast_restore_success', { count: data.restored }));
    } catch (err: any) {
      toast.error(t('toast_backup_failed'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction || confirmAction.type !== 'delete') return;
    setIsActioning(true);
    setConfirmAction(null);
    try {
      const res = await fetch(
        `${window.location.origin}/api/backups/${confirmAction.backup.id}`,
        { method: 'DELETE', headers }
      );
      if (!res.ok) throw new Error('Failed to delete backup.');
      setBackups(prev => prev.filter(b => b.id !== confirmAction.backup.id));
      toast.success(t('toast_backup_deleted'));
    } catch (err: any) {
      toast.error(t('toast_backup_failed'));
    } finally {
      setIsActioning(false);
    }
  };

  return (
    <div className="relative">
      <div className="space-y-4">

        {/* Free user hint banner */}
        {!isPremium && (
          <button
            onClick={() => onOpenPremium?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-all"
          >
            <Crown size={14} className="text-amber-400 shrink-0" />
            <span className="text-caption font-bold text-amber-400 text-left flex-1">Premium feature — tap to upgrade and unlock</span>
          </button>
        )}

        {/* Header + Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sub font-black text-[var(--text-primary)]">{t('settings_backup')}</p>
            <p className="text-tiny text-text-muted">{t('backup_count', { count: backups.length })}</p>
          </div>
          <button
            onClick={isPremium ? handleCreateBackup : () => onOpenPremium?.()}
            disabled={isPremium && isSaving}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#7c6aff] text-white text-caption font-bold hover:bg-[#a78bfa] transition-all disabled:opacity-50"
          >
            {isPremium && isSaving
              ? <><RefreshCw size={12} className="animate-spin" /> {t('saving')}</>
              : <><Save size={12} /> {t('btn_backup_now')} {!isPremium && <Crown size={13} className="text-amber-500 ml-1" style={{ filter: 'drop-shadow(0 0 3px #f59e0b88)' }} />}</>}
          </button>
        </div>

        {/* Restore Mode */}
        <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 space-y-2">
          <p className="text-tiny font-bold text-text-muted uppercase tracking-wider">{t('backup_restore_mode_label')}</p>
          <div className="flex gap-2">
            {(['merge', 'replace'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setRestoreMode(mode)}
                className={`flex-1 py-2 rounded-xl text-tiny font-bold border transition-all ${restoreMode === mode
                    ? mode === 'replace'
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-[#34d399]/15 border-[#34d399]/40 text-[#34d399]'
                    : 'border-[var(--border-color)] text-text-muted'
                  }`}
              >
                {mode === 'merge' ? t('backup_mode_merge') : t('backup_mode_replace')}
              </button>
            ))}
          </div>
          <p className="text-tiny text-text-muted">
            {restoreMode === 'merge'
              ? t('backup_merge_hint')
              : t('backup_replace_hint')}
          </p>
        </div>

        {/* Backup List */}
        {loading ? (
          <div className="text-center py-8 text-text-muted text-sub">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-40" />
            {t('backup_loading')}
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sub">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center mx-auto mb-3">
              <Save size={20} className="opacity-30" />
            </div>
            {t('backup_empty')}<br />
            <span className="text-tiny">{t('backup_empty_hint')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map(backup => (
              <motion.div key={backup.id} layout
                className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7c6aff]/10 border border-[#7c6aff]/20 flex items-center justify-center shrink-0">
                  <Save size={14} className="text-[#a78bfa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-caption font-bold truncate">{backup.label}</p>
                  <p className="text-tiny text-text-muted">
                    {backup.entries_count} {t('backup_entries_label')} · {formatDate(backup.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => isPremium ? setConfirmAction({ type: 'restore', backup, mode: restoreMode }) : onOpenPremium?.()}
                    disabled={isPremium && isActioning}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg bg-[#34d399]/10 text-[#34d399] text-tiny font-bold hover:bg-[#34d399]/20 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={11} /> {t('btn_restore')}
                    {!isPremium && <Crown size={13} className="text-amber-500 ml-1" style={{ filter: 'drop-shadow(0 0 3px #f59e0b88)' }} />}
                  </button>
                  <button
                    onClick={() => isPremium ? setConfirmAction({ type: 'delete', backup }) : onOpenPremium?.()}
                    disabled={isPremium && isActioning}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Confirm Modal */}
        <AnimatePresence>
          {confirmAction && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${confirmAction.type === 'delete' || (confirmAction.type === 'restore' && confirmAction.mode === 'replace')
                    ? 'bg-gradient-to-r from-red-500 to-rose-600'
                    : 'bg-gradient-to-r from-[#34d399] to-[#7c6aff]'
                  }`} />
                <button onClick={() => setConfirmAction(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${confirmAction.type === 'delete' || (confirmAction.type === 'restore' && confirmAction.mode === 'replace')
                      ? 'bg-red-500/10 text-red-500' : 'bg-[#34d399]/10 text-[#34d399]'
                    }`}>
                    <AlertTriangle size={28} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold">
                      {confirmAction.type === 'delete' ? t('backup_delete_confirm')
                        : confirmAction.mode === 'replace' ? t('backup_replace_confirm')
                          : t('backup_merge_confirm')}
                    </h3>
                    <p className="text-sub font-semibold text-[#a78bfa]">{confirmAction.backup.label}</p>
                    <p className="text-body text-text-muted leading-relaxed">
                      {confirmAction.type === 'delete'
                        ? t('backup_delete_warning')
                        : confirmAction.mode === 'replace'
                          ? <>{t('backup_replace_warning')} {t('backup_replace_desc', { count: confirmAction.backup.entries_count })}</>
                          : <>{t('backup_merge_desc', { count: confirmAction.backup.entries_count })}</>}
                    </p>
                  </div>
                  <div className="w-full flex gap-2 pt-1">
                    <button onClick={() => setConfirmAction(null)}
                      className="flex-1 h-11 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold text-body hover:text-text-primary transition-all">
                      {t('btn_cancel')}
                    </button>
                    <button
                      onClick={confirmAction.type === 'delete' ? handleDelete : handleRestore}
                      className={`flex-1 h-11 rounded-xl text-white font-bold text-body transition-all shadow-lg ${confirmAction.type === 'delete' || confirmAction.mode === 'replace'
                          ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                          : 'bg-[#34d399] hover:bg-[#6ee7b7] shadow-[#34d399]/20'
                        }`}>
                      {confirmAction.type === 'delete' ? t('btn_delete') : confirmAction.mode === 'replace' ? t('btn_replace') : t('btn_merge')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};