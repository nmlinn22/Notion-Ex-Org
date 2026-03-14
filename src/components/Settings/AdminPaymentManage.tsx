import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw, ImageIcon, Check, XCircle, RotateCcw,
  ChevronDown, ChevronUp, MessageSquare, X, CheckCircle
} from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// ── Plan → days mapping ──
const PLAN_DAYS: Record<string, number> = {
  days_30: 30,
  days_90: 90,
  days_180: 180,
  days_365: 365,
  // backward compat
  monthly: 30,
  yearly: 365,
};

function getPlanDays(plan: string): number {
  return PLAN_DAYS[plan?.toLowerCase()] ?? 30;
}

interface PaymentRequest {
  id: string;
  user_id: string;
  user_email: string;
  plan: string;               // 'monthly' | 'yearly'
  payment_method: string;
  transaction_id: string;
  screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reject_reason?: string | null;
}

interface AdminPaymentManageProps {
  onToast: (msg: string) => void;
  admin: any;
}

export const AdminPaymentManage: React.FC<AdminPaymentManageProps> = ({ onToast, admin }) => {
  const { t } = useLanguage();

  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Undo modal
  const [undoTarget, setUndoTarget] = useState<PaymentRequest | null>(null);

  // Screenshot modal — re-fetch fresh signed URL on open
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotTarget, setScreenshotTarget] = useState<PaymentRequest | null>(null);

  // ── Fetch ──
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments((data ?? []) as PaymentRequest[]);
    } catch (err: any) {
      toast.error('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return payments.filter(p => {
      const matchSearch = !q || p.user_email?.toLowerCase().includes(q) || p.transaction_id?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const counts = {
    pending:  payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

  // ── Open screenshot — get fresh signed URL ──
  const openScreenshot = async (p: PaymentRequest) => {
    if (!p.screenshot_url) return;
    setScreenshotTarget(p);
    setScreenshotLoading(true);
    setScreenshotUrl(null);

    try {
      // screenshot_url may be: (1) raw path "userId/timestamp.ext", (2) old signed URL
      let storagePath = p.screenshot_url;

      // If it's a full signed URL, extract the path portion
      const pathMatch = p.screenshot_url.match(/payment-screenshots\/(.+?)(\?|$)/);
      if (pathMatch) {
        storagePath = pathMatch[1];
      }
      // storagePath is now always a raw storage path — get fresh signed URL (1 hour)
      const { data, error } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(storagePath, 3600);
      if (error) throw error;
      setScreenshotUrl(data.signedUrl);
    } catch (err: any) {
      toast.error('Could not load screenshot: ' + err.message);
      setScreenshotTarget(null);
    } finally {
      setScreenshotLoading(false);
    }
  };

  // ── Approve ──
  const handleApprove = async (p: PaymentRequest) => {
    setProcessingId(p.id);
    const success = await admin.handleApprovePayment(p.id);
    if (success) {
      onToast(`✅ Approved — ${p.user_email}`);
      fetchPayments();
    }
    setProcessingId(null);
  };

  // ── Reject with reason ──
  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    const success = await admin.handleRejectPayment(rejectTarget.id, rejectReason.trim());
    if (success) {
      onToast(`❌ Rejected — ${rejectTarget.user_email}`);
      setRejectTarget(null);
      setRejectReason('');
      fetchPayments();
    }
    setProcessingId(null);
  };

  // ── Undo → reset to pending ──
  const handleUndo = async (p: PaymentRequest) => {
    setProcessingId(p.id);
    const success = await admin.handleUndoPayment(p.id);
    if (success) {
      onToast(`↩ Reset to pending — ${p.user_email}`);
      setUndoTarget(null);
      fetchPayments();
    }
    setProcessingId(null);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; bg: string; labelKey: string }> = {
      pending:  { color: '#f59e0b', bg: '#f59e0b15', labelKey: 'payment_status_pending' },
      approved: { color: '#10b981', bg: '#10b98115', labelKey: 'payment_status_approved' },
      rejected: { color: '#ef4444', bg: '#ef444415', labelKey: 'payment_status_rejected' },
    };
    const s = map[status] || map.pending;
    return (
      <span className="text-[8px] font-bold px-2 py-0.5 rounded-full"
        style={{ color: s.color, backgroundColor: s.bg }}>
        {t(s.labelKey as any)}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { labelKey: 'payment_status_pending',  color: '#f59e0b', count: counts.pending },
          { labelKey: 'payment_status_approved', color: '#10b981', count: counts.approved },
          { labelKey: 'payment_status_rejected', color: '#ef4444', count: counts.rejected },
        ].map(s => (
          <div key={s.labelKey} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-center">
            <div className="text-xl font-black" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[9px] text-text-muted font-semibold mt-0.5">{t(s.labelKey as any)}</div>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <button onClick={fetchPayments} disabled={loading}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors">
        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> {t('admin_refresh_btn')}
      </button>

      {/* Status Filter */}
      <div className="flex gap-1 p-1 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
        {([
          { id: 'all',      labelKey: 'payment_filter_all',      count: payments.length },
          { id: 'pending',  labelKey: 'payment_status_pending',  count: counts.pending,  color: '#f59e0b' },
          { id: 'approved', labelKey: 'payment_status_approved', count: counts.approved, color: '#10b981' },
          { id: 'rejected', labelKey: 'payment_status_rejected', count: counts.rejected, color: '#ef4444' },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
              statusFilter === f.id ? 'bg-[var(--bg-card)] text-[#a78bfa] shadow' : 'text-text-muted hover:text-text-primary'
            }`}>
            {'color' in f && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: f.color }} />}
            {t(f.labelKey as any)}
            <span className={`text-[8px] px-1 rounded-full ${statusFilter === f.id ? 'bg-[#7c6aff]/20' : 'bg-[var(--bg-input)]'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder={t('payment_search_placeholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#7c6aff]/50 transition-all"
      />

      {/* Payment list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-text-muted text-xs">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-20" />
            {t('admin_loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs italic bg-[var(--bg-input)]/30 rounded-2xl border border-dashed border-[var(--border-color)]">
            {t('payment_no_results')}
          </div>
        ) : filtered.map((p) => {
          const isExpanded = expandedId === p.id;
          const days = getPlanDays(p.plan);

          return (
            <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm transition-all hover:border-[#7c6aff]/30">
              <div className="p-4">
                {/* Header Info */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-bold text-text-primary truncate">{p.user_email}</p>
                      {statusBadge(p.status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-[#a78bfa] bg-[#a78bfa]/10 px-2 py-0.5 rounded-md">
                        {p.plan} ({days}d)
                      </span>
                      <span className="text-[10px] font-bold text-text-muted">
                        {p.payment_method} · {fmt(p.created_at)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Transaction ID & Screenshot */}
                <div className="flex items-center justify-between gap-3 p-3 bg-[var(--bg-input)]/50 rounded-xl border border-[var(--border-color)] mb-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-text-muted mb-0.5">{t('payment_txn_id_label')}</p>
                    <p className="text-[11px] font-mono text-text-primary truncate">{p.transaction_id}</p>
                  </div>
                  {p.screenshot_url && (
                    <button
                      onClick={() => openScreenshot(p)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-[#a78bfa] hover:text-white hover:bg-[#7c6aff] px-3 py-1.5 rounded-lg bg-[#7c6aff]/10 border border-[#7c6aff]/20 transition-all shrink-0"
                    >
                      <ImageIcon size={12} /> {t('payment_screenshot_label')}
                    </button>
                  )}
                </div>

                {/* Reject Reason (if any) */}
                {p.status === 'rejected' && p.reject_reason && (
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl mb-4">
                    <p className="text-[11px] font-semibold text-red-400 mb-1">Rejection Reason</p>
                    <p className="text-[11px] text-red-300/80 leading-relaxed">{p.reject_reason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {p.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => { setRejectTarget(p); setRejectReason(''); }}
                        disabled={processingId === p.id}
                        className="flex-1 h-10 rounded-xl border border-red-500/30 text-red-400 text-[11px] font-black hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                      >
                        <XCircle size={14} /> {t('payment_reject_btn')}
                      </button>
                      <button
                        onClick={() => handleApprove(p)}
                        disabled={processingId === p.id}
                        className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                      >
                        <CheckCircle size={14} /> {t('payment_approve_btn')} (+{days}d)
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setUndoTarget(p)}
                      disabled={processingId === p.id}
                      className="flex-1 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted text-[11px] font-black hover:text-text-primary hover:border-[#7c6aff]/40 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                    >
                      <RotateCcw size={14} /> {t('payment_undo_btn')}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-[var(--border-color)] bg-[var(--bg-input)]/30"
                  >
                    <div className="p-4 space-y-3">
                      <p className="text-[12px] font-semibold text-text-muted">{t('payment_full_details_label')}</p>
                      <div className="grid gap-2">
                        {[
                          { label: t('payment_txn_id_label'), value: p.transaction_id },
                          { label: 'Request ID',  value: p.id },
                          { label: 'User ID',     value: p.user_id },
                          { label: 'Plan',        value: `${p.plan} (${days} days)` },
                          { label: 'Method',      value: p.payment_method },
                          { label: 'Submitted',   value: new Date(p.created_at).toLocaleString() },
                          { label: 'Status',      value: p.status },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between gap-4 text-[11px]">
                            <span className="text-text-muted">{row.label}</span>
                            <span className="font-mono text-text-primary text-right break-all">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── MODALS ── */}

      {/* Reject modal */}
      <AnimatePresence>
        {rejectTarget && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-semibold text-red-400">{t('payment_reject_modal_title')}</span>
                  <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[200px]">{rejectTarget.user_email}</p>
                </div>
                <button onClick={() => setRejectTarget(null)} className="text-text-muted hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-muted mb-1.5">
                    <MessageSquare size={9} className="inline mr-1" />
                    {t('payment_reject_reason_label')}
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder={t('payment_reject_reason_placeholder')}
                    rows={3}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500/50 resize-none text-text-primary placeholder:text-text-muted"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRejectTarget(null)}
                    className="flex-1 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold text-sm">
                    {t('btn_cancel')}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processingId === rejectTarget.id}
                    className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} /> {t('payment_reject_btn')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Undo confirm */}
      <AnimatePresence>
        {undoTarget && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">{t('payment_undo_btn')}</h3>
                <p className="text-sm text-text-muted mt-1">{t('payment_undo_confirm')}</p>
                {undoTarget.status === 'approved' && (
                  <p className="text-[10px] text-orange-400 mt-1 font-semibold">
                    ⚠ {t('payment_undo_warning')}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1">{undoTarget.user_email}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUndoTarget(null)}
                  className="flex-1 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold text-sm">
                  {t('btn_cancel')}
                </button>
                <button
                  onClick={() => handleUndo(undoTarget)}
                  disabled={processingId === undoTarget.id}
                  className="flex-1 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
                >
                  {t('payment_undo_btn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Screenshot modal — fresh signed URL */}
      <AnimatePresence>
        {screenshotTarget && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" onClick={() => { setScreenshotTarget(null); setScreenshotUrl(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-semibold text-text-primary">{t('payment_screenshot_label')}</span>
                  <p className="text-[9px] text-text-muted mt-0.5 truncate max-w-[200px]">{screenshotTarget.user_email}</p>
                </div>
                <button onClick={() => { setScreenshotTarget(null); setScreenshotUrl(null); }}
                  className="text-text-muted hover:text-text-primary">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 bg-black/30 flex items-center justify-center min-h-[200px] max-h-[65vh] overflow-y-auto">
                {screenshotLoading ? (
                  <div className="flex flex-col items-center gap-3 text-text-muted">
                    <RefreshCw size={24} className="animate-spin" />
                    <p className="text-[10px] font-bold">{t('admin_loading')}</p>
                  </div>
                ) : screenshotUrl ? (
                  <img src={screenshotUrl} alt="Payment screenshot" className="max-w-full rounded-xl shadow-lg" />
                ) : (
                  <p className="text-[11px] text-red-400 font-bold">Failed to load screenshot.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};