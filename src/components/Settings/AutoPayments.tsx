import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, Crown, RefreshCw, ToggleLeft, ToggleRight, Calendar, Pencil } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useLanguage } from '../../lib/LanguageContext';

interface AutoPayment {
  id: string;
  item: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  group: string;
  day_of_month: number;
  active: boolean;
  last_run: string;
}

interface AutoPaymentsProps {
  session: Session;
  userRole: string;
  isAdmin: boolean;
  groups: string[];
  categories: string[];
  onOpenPremium?: () => void;
}

const ORDINAL = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const AutoPayments: React.FC<AutoPaymentsProps> = ({
  session, userRole, isAdmin, groups, categories, onOpenPremium
}) => {
  const { t } = useLanguage();
  const isPremium = isAdmin || userRole === 'premium' || userRole === 'admin';
  const [payments, setPayments] = useState<AutoPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    item: '', amount: '', type: 'expense' as 'expense' | 'income',
    category: '', group: '', day_of_month: 1
  });

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` };
  const api = (path: string, opts?: RequestInit) => fetch(`${window.location.origin}${path}`, { headers, ...opts });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api('/api/auto-payments');
      const data = await res.json();
      if (Array.isArray(data)) setPayments(data);
    } catch { toast.error(t('toast_autopay_load_failed')); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isPremium) load(); else setLoading(false); }, [isPremium]);

  const resetForm = () => {
    setForm({ item: '', amount: '', type: 'expense', category: '', group: '', day_of_month: 1 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.item.trim()) { toast.error(t('toast_item_required')); return; }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error(t('toast_amount_required')); return; }

    const body = { ...form, amount: Number(form.amount) };
    try {
      if (editingId) {
        const res = await api(`/api/auto-payments/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
        const data = await res.json();
        setPayments(prev => prev.map(p => p.id === editingId ? data : p));
        toast.success(t('toast_updated'));
      } else {
        const res = await api('/api/auto-payments', { method: 'POST', body: JSON.stringify(body) });
        const data = await res.json();
        setPayments(prev => [...prev, data]);
        toast.success(t('toast_autopay_added'));
      }
      resetForm();
    } catch { toast.error(t('toast_save_failed')); }
  };

  const handleToggle = async (p: AutoPayment) => {
    try {
      const res = await api(`/api/auto-payments/${p.id}`, {
        method: 'PUT', body: JSON.stringify({ ...p, active: !p.active })
      });
      const data = await res.json();
      setPayments(prev => prev.map(x => x.id === p.id ? data : x));
    } catch { toast.error('Failed to update.'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`/api/auto-payments/${id}`, { method: 'DELETE' });
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success(t('toast_deleted'));
    } catch { toast.error(t('toast_save_failed')); }
  };

  const handleEdit = (p: AutoPayment) => {
    setForm({ item: p.item, amount: String(p.amount), type: p.type, category: p.category, group: p.group, day_of_month: p.day_of_month });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await api('/api/auto-payments/run', { method: 'POST' });
      const data = await res.json();
      if (data.triggered?.length > 0) {
        toast.success(`Auto-added: ${data.triggered.join(', ')}`);
        // Reload entries by refreshing
        window.dispatchEvent(new CustomEvent('entries-updated'));
      } else {
        toast.success(t('toast_no_payments_due'));
      }
      load();
    } catch { toast.error(t('toast_run_failed')); }
    finally { setRunning(false); }
  };

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div>
      <label className="text-tiny font-bold text-text-muted mb-1.5 block">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sub font-medium appearance-none outline-none focus:border-[#7c6aff]/50 focus:bg-[#7c6aff]/5 transition-all pr-8">
          <option value="">{t('autopay_select_placeholder')}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="relative">
      <div className="space-y-3">
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
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7c6aff]/8 to-[#7c6aff]/3 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body font-black text-[var(--text-primary)]">{t('autopay_header_title')}</p>
              <p className="text-tiny text-text-muted mt-1">{t('autopay_active_count', { count: payments.filter(p => p.active).length })}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={isPremium ? handleRun : () => onOpenPremium?.()} disabled={isPremium && running}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-[var(--border-color)] text-tiny font-bold text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/40 transition-all disabled:opacity-50">
                <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
                {t('autopay_run_now')}
              </button>
              <button onClick={isPremium ? () => { resetForm(); setShowForm(true); } : () => onOpenPremium?.()}
                className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#7c6aff] text-white text-tiny font-bold hover:bg-[#8b7aff] transition-all shadow-lg shadow-[#7c6aff]/30">
                <Plus size={13} /> {t('autopay_add_btn')}
                {!isPremium && <Crown size={13} className="text-amber-500 ml-1" style={{ filter: 'drop-shadow(0 0 3px #f59e0b88)' }} />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,34,0.95)]">
              <div className="bg-gradient-to-br from-[#7c6aff]/8 to-transparent border border-[#7c6aff]/30 rounded-2xl p-6 w-full max-w-md relative">
                <button onClick={resetForm} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <span className="sr-only">Close</span>
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                <p className="text-sub font-black text-[#a78bfa] mb-4">{editingId ? t('autopay_edit_title') : t('autopay_new_title')}</p>
                {/* Item & Amount */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-tiny font-bold text-text-muted mb-1.5 block">{t('autopay_item_label')}</label>
                    <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
                      placeholder={t('autopay_item_placeholder')}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sub font-medium outline-none focus:border-[#7c6aff]/50 focus:bg-[#7c6aff]/5 transition-all" />
                  </div>
                  <div>
                    <label className="text-tiny font-bold text-text-muted mb-1.5 block">{t('autopay_amount_label')}</label>
                    <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder={t('autopay_amount_placeholder')} type="number"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sub font-medium outline-none focus:border-[#7c6aff]/50 focus:bg-[#7c6aff]/5 transition-all" />
                  </div>
                </div>
                {/* Type */}
                <div className="flex gap-2 mb-3">
                  {(['expense', 'income'] as const).map(tp => (
                    <button key={tp} onClick={() => setForm(p => ({ ...p, type: tp }))}
                      className={`flex-1 py-2.5 rounded-xl text-tiny font-bold border transition-all ${form.type === tp ? (tp === 'expense' ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/10' : 'bg-[#34d399]/20 border-[#34d399]/50 text-[#34d399] shadow-lg shadow-[#34d399]/10') : 'border-[var(--border-color)] text-text-muted hover:border-[#7c6aff]/40'}`}>
                      {tp === 'expense' ? t('autopay_type_expense') : t('autopay_type_income')}
                    </button>
                  ))}
                </div>
                {/* Category & Group */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <SelectField label={t('autopay_category_label')} value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} options={categories} />
                  <SelectField label={t('autopay_group_label')} value={form.group} onChange={v => setForm(p => ({ ...p, group: v }))} options={groups} />
                </div>
                {/* Day of month */}
                <div className="mb-4">
                  <label className="text-tiny font-bold text-text-muted mb-1.5 block">{t('autopay_day_label')}</label>
                  <div className="flex items-center gap-3">
                    <input value={form.day_of_month} onChange={e => setForm(p => ({ ...p, day_of_month: Math.min(31, Math.max(1, Number(e.target.value))) }))}
                      type="number" min={1} max={31}
                      className="w-24 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sub font-bold text-center outline-none focus:border-[#7c6aff]/50 focus:bg-[#7c6aff]/5 transition-all" />
                    <p className="text-tiny text-text-muted">{t('autopay_day_hint')} <span className="text-[#a78bfa] font-bold">{ORDINAL(form.day_of_month)}</span></p>
                  </div>
                </div>
                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSubmit}
                    className="flex-1 h-10 rounded-lg bg-[#7c6aff] text-white text-sub font-bold hover:bg-[#8b7aff] transition-all shadow-lg shadow-[#7c6aff]/20">
                    {editingId ? t('btn_save_changes') : t('autopay_btn_add')}
                  </button>
                  <button onClick={resetForm}
                    className="px-5 h-10 rounded-lg border border-[var(--border-color)] text-sub text-text-muted font-bold hover:text-red-400 hover:border-red-400/30 transition-all">
                    {t('btn_cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payments List */}
        {loading ? (
          <div className="text-center py-8 text-text-muted text-sub">{t('loading')}</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sub">
            <Calendar size={28} className="mx-auto mb-2 opacity-30" />
            {t('autopay_empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map(p => (
              <motion.div key={p.id} layout
                className={`rounded-xl px-3 py-2 flex gap-2 items-center transition-all ${p.active ? 'bg-[#18152a] border border-[#7c6aff]/20' : 'bg-[var(--bg-input)] border border-[var(--border-color)] opacity-60'}`}
                style={{ minHeight: 64 }}>
                {/* Day badge */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7c6aff] to-[#5a4ae8] flex flex-col items-center justify-center shrink-0 mr-2">
                  <span className="text-tiny text-white/70 font-semibold leading-none">DAY</span>
                  <span className="text-body font-bold text-white leading-tight" style={{ fontSize: 18 }}>{p.day_of_month}</span>
                </div>
                {/* Info: 4 rows */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-tiny text-[var(--text-primary)]" style={{ fontSize: 13 }}>Item Name:</span>
                    <span className="text-sub font-semibold text-[var(--text-primary)] truncate max-w-[110px]" style={{ fontSize: 13 }}>{p.item}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-tiny text-[var(--text-primary)]" style={{ fontSize: 13 }}>Amount:</span>
                    <span className={`text-sub font-mono ${p.type === 'income' ? 'text-[#34d399]' : 'text-[#f87171]'}`} style={{ fontSize: 13 }}>{p.type === 'income' ? '+' : '-'}{Number(p.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-tiny text-[var(--text-primary)]" style={{ fontSize: 13 }}>Group:</span>
                    <span className="text-tiny text-text-muted truncate max-w-[80px]" style={{ fontSize: 11 }}>{p.group}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-tiny text-[var(--text-primary)]" style={{ fontSize: 13 }}>Category:</span>
                    <span className="text-tiny text-text-muted truncate max-w-[80px]" style={{ fontSize: 11 }}>{p.category}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-tiny text-[var(--text-primary)]" style={{ fontSize: 13 }}>Last Run:</span>
                    <span className="text-tiny text-text-muted/60" style={{ fontSize: 10 }}>{p.last_run}</span>
                  </div>
                </div>
                {/* Actions: vertical, compact */}
                <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
                  <button onClick={() => isPremium ? handleEdit(p) : onOpenPremium?.()} className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:bg-[#7c6aff]/15 transition-all">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => isPremium ? handleToggle(p) : onOpenPremium?.()} className="w-7 h-7 rounded-md flex items-center justify-center transition-all">
                    {p.active
                      ? <ToggleRight size={15} className="text-[#7c6aff]" />
                      : <ToggleLeft size={15} className="text-text-muted" />}
                  </button>
                  <button onClick={() => isPremium ? handleDelete(p.id) : onOpenPremium?.()} className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/15 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};