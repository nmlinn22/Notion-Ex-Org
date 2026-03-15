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
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
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
      <label className="text-[10px] font-bold text-text-muted mb-1 block">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold appearance-none outline-none focus:border-[#7c6aff]/50 pr-8">
          <option value="">{t('autopay_select_placeholder')}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
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
          <span className="text-[11px] font-bold text-amber-400 text-left flex-1">Premium feature — tap to upgrade and unlock</span>
        </button>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-[var(--text-primary)]">{t('autopay_header_title')}</p>
          <p className="text-[10px] text-text-muted">{t('autopay_active_count', { count: payments.filter(p => p.active).length })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={isPremium ? handleRun : () => onOpenPremium?.()} disabled={isPremium && running}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl border border-[var(--border-color)] text-[10px] font-bold text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/40 transition-all disabled:opacity-50">
            <RefreshCw size={11} className={running ? 'animate-spin' : ''} />
            {t('autopay_run_now')}
          </button>
          <button onClick={isPremium ? () => { resetForm(); setShowForm(true); } : () => onOpenPremium?.()}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-[#7c6aff] text-white text-[10px] font-bold hover:bg-[#a78bfa] transition-all">
            <Plus size={12} /> {t('autopay_add_btn')}
            {!isPremium && <Crown size={13} className="text-amber-500 ml-1" style={{ filter: 'drop-shadow(0 0 3px #f59e0b88)' }} />}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-[var(--bg-input)] border border-[#7c6aff]/30 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-[#a78bfa]">{editingId ? t('autopay_edit_title') : t('autopay_new_title')}</p>

            {/* Item & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-muted mb-1 block">{t('autopay_item_label')}</label>
                <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))}
                  placeholder={t('autopay_item_placeholder')}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#7c6aff]/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-muted mb-1 block">{t('autopay_amount_label')}</label>
                <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder={t('autopay_amount_placeholder')} type="number"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#7c6aff]/50" />
              </div>
            </div>

            {/* Type */}
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map(tp => (
                <button key={tp} onClick={() => setForm(p => ({ ...p, type: tp }))}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${form.type === tp ? (tp === 'expense' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'bg-[#34d399]/15 border-[#34d399]/40 text-[#34d399]') : 'border-[var(--border-color)] text-text-muted'}`}>
                  {tp === 'expense' ? t('autopay_type_expense') : t('autopay_type_income')}
                </button>
              ))}
            </div>

            {/* Category & Group */}
            <div className="grid grid-cols-2 gap-3">
              <SelectField label={t('autopay_category_label')} value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} options={categories} />
              <SelectField label={t('autopay_group_label')} value={form.group} onChange={v => setForm(p => ({ ...p, group: v }))} options={groups} />
            </div>

            {/* Day of month */}
            <div>
              <label className="text-[10px] font-bold text-text-muted mb-1 block">{t('autopay_day_label')}</label>
              <div className="flex items-center gap-3">
                <input value={form.day_of_month} onChange={e => setForm(p => ({ ...p, day_of_month: Math.min(31, Math.max(1, Number(e.target.value))) }))}
                  type="number" min={1} max={31}
                  className="w-20 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-bold text-center outline-none focus:border-[#7c6aff]/50" />
                <p className="text-[10px] text-text-muted">{t('autopay_day_hint')} <span className="text-[#a78bfa] font-bold">{ORDINAL(form.day_of_month)}</span></p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSubmit}
                className="flex-1 h-9 rounded-xl bg-[#7c6aff] text-white text-xs font-bold hover:bg-[#a78bfa] transition-all">
                {editingId ? t('btn_save_changes') : t('autopay_btn_add')}
              </button>
              <button onClick={resetForm}
                className="px-4 h-9 rounded-xl border border-[var(--border-color)] text-xs text-text-muted font-bold hover:text-red-400 transition-all">
                {t('btn_cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments List */}
      {loading ? (
        <div className="text-center py-8 text-text-muted text-xs">{t('loading')}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-xs">
          <Calendar size={28} className="mx-auto mb-2 opacity-30" />
          {t('autopay_empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <motion.div key={p.id} layout
              className={`bg-[var(--bg-input)] border rounded-xl p-3 flex items-center gap-3 transition-all ${p.active ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-50'}`}>

              {/* Day badge */}
              <div className="w-10 h-10 rounded-xl bg-[#7c6aff]/10 border border-[#7c6aff]/20 flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] text-text-muted font-semibold leading-none">{t('autopay_day_badge')}</span>
                <span className="text-sm font-black text-[#a78bfa] leading-tight">{p.day_of_month}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{p.item}</p>
                <p className="text-[9px] text-text-muted">{p.group} · {p.category}</p>
                {p.last_run && <p className="text-[9px] text-text-muted">{t('autopay_last_run')} {p.last_run}</p>}
              </div>

              {/* Amount */}
              <span className={`text-xs font-black font-mono shrink-0 ${p.type === 'income' ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                {p.type === 'income' ? '+' : '-'}{Number(p.amount).toLocaleString()}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => isPremium ? handleEdit(p) : onOpenPremium?.()} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:bg-[#7c6aff]/10 transition-all">
                  <Pencil size={11} />
                </button>
                <button onClick={() => isPremium ? handleToggle(p) : onOpenPremium?.()} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all">
                  {p.active
                    ? <ToggleRight size={18} className="text-[#7c6aff]" />
                    : <ToggleLeft size={18} className="text-text-muted" />}
                </button>
                <button onClick={() => isPremium ? handleDelete(p.id) : onOpenPremium?.()} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={11} />
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