import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, ChevronDown, CheckCircle2, Loader2, Crown, Sparkles } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

interface CSVImportProps {
  session: Session;
  userRole: string;
  isAdmin: boolean;
  groups: string[];
  categories: string[];
  onImportComplete: () => void;
  onOpenPremium?: () => void;
}

type ColumnMapping = {
  date: string;
  item: string;
  income: string;
  expense: string;
  category: string;
  group: string;
  type: string;
};

type EntryType = 'expense' | 'income' | 'auto';

export const CSVImport: React.FC<CSVImportProps> = ({
  session, userRole, isAdmin, groups, categories, onImportComplete, onOpenPremium
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'map' | 'ai' | 'preview' | 'done'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '', item: '', income: '', expense: '', category: '', group: '', type: ''
  });
  const [amountMode, setAmountMode] = useState<'split' | 'single'>('split');
  const [defaultType, setDefaultType] = useState<EntryType>('expense');
  const [defaultGroup, setDefaultGroup] = useState((groups && groups.length > 0) ? groups[0] : '');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState('');
  const [previewEntries, setPreviewEntries] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  React.useEffect(() => {
    if (groups && groups.length > 0 && !defaultGroup) setDefaultGroup(groups[0]);
  }, [groups]);

  const isPremium = isAdmin || userRole === 'premium' || userRole === 'admin';

  // ── CSV Parser ────────────────────────────────────────────────────────────
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    const parse = (line: string) => {
      const result: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      result.push(cur.trim());
      return result;
    };
    return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) };
  };

  const parseAmount = (val: string) => parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;

  const parseDate = (val: string) => {
    if (!val) return new Date().toISOString().split('T')[0];
    const clean = val.trim();
    // Already ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    // Excel US format: M/D/YYYY or MM/DD/YYYY
    const slash = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
      let [, m, d, y] = slash; // Excel exports M/D/YYYY (month first)
      if (y.length === 2) y = '20' + y;
      // Validate month range
      const mNum = parseInt(m);
      const dNum = parseInt(d);
      if (mNum >= 1 && mNum <= 12) {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        // Maybe D/M/YYYY format, swap
        return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
      }
    }
    // Try native Date parse
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
  };

  // ── File Handler ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error(t('csv_only_csv_allowed')); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('csv_file_too_large')); return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) { toast.error(t('csv_read_error')); return; }
      if (rows.length > 1000) { toast.error(t('csv_max_rows')); return; }
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-detect mapping
      const autoMap: any = { date: '', item: '', income: '', expense: '', category: '', group: '', type: '' };
      headers.forEach(h => {
        const l = h.toLowerCase();
        // Auto-detect column headers in both English and Myanmar
        if (/^date|^day|ရက်/.test(l)) autoMap.date = h;
        else if (/item|desc|detail|description|မှတ်ချက်|ပစ္စည်း/.test(l)) autoMap.item = h;
        else if (/^income|revenue|ဝင်ငွေ/.test(l)) autoMap.income = h;
        else if (/^expense|^amount|spend|ငွေ|ပမာဏ|အသုံး/.test(l)) autoMap.expense = h;
        else if (/categ|ကဏ္ဍ|အမျိုးအစား/.test(l)) autoMap.category = h;
        else if (/group|အုပ်စု/.test(l)) autoMap.group = h;
        else if (/type|kind/.test(l)) autoMap.type = h;
      });
      if (!autoMap.income && autoMap.expense) setAmountMode('single');
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ── Build raw entries from CSV ────────────────────────────────────────────
  const buildRawEntries = () => {
    return csvRows.slice(0, 1000).map(row => {
      const get = (col: string) => col ? (row[csvHeaders.indexOf(col)] ?? '') : '';
      const dateVal = parseDate(get(mapping.date));
      const itemVal = get(mapping.item) || 'Unknown';
      const categoryVal = get(mapping.category) || defaultCategory;
      const groupVal = get(mapping.group) || '';

      let income = 0, expense = 0;
      if (amountMode === 'split') {
        income = parseAmount(get(mapping.income));
        expense = parseAmount(get(mapping.expense));
      } else {
        const amt = parseAmount(get(mapping.expense));
        const typeVal = mapping.type ? get(mapping.type).toLowerCase() : '';
        const isIncome = defaultType === 'income' ||
          (defaultType === 'auto' && (typeVal.includes('income') || typeVal.includes('salary') || typeVal.includes('ဝင်') /* Myanmar: income */));
        if (isIncome) income = amt; else expense = amt;
      }

      return { date: dateVal, item: itemVal, income: income || null, expense: expense || null, category: categoryVal, group: groupVal };
    }).filter(e => e.item && e.item !== 'Unknown');
  };

  // ── AI Assign Group + Category (via server proxy) ───────────────────────
  const aiAssign = async (entries: any[]) => {
    const BATCH_SIZE = 50;
    const result = [...entries];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      setAiProgress(Math.round((i / entries.length) * 100));
      setAiStatus(`AI Processing...... (${i + 1}-${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length})`);

      try {
        const res = await fetch(`${window.location.origin}/api/ai-assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ entries: batch, groups, categories })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          data.data.forEach((item: { group: string; category: string }, batchIdx: number) => {
            const globalIdx = i + batchIdx;
            if (result[globalIdx]) {
              result[globalIdx].group = item.group || defaultGroup;
              result[globalIdx].category = item.category || 'Others';
            }
          });
        }
      } catch (err) {
        batch.forEach((_, batchIdx) => {
          const globalIdx = i + batchIdx;
          if (!result[globalIdx].group) result[globalIdx].group = defaultGroup;
          if (!result[globalIdx].category) result[globalIdx].category = 'Others';
        });
      }
    }

    setAiProgress(100);
    setAiStatus('AI processing complete!');
    return result;
  };

  // ── Build Preview (with or without AI) ───────────────────────────────────
  const buildPreview = async () => {
    if (!mapping.date || !mapping.item) {
      toast.error(t('csv_missing_columns')); return;
    }
    const raw = buildRawEntries();
    if (!raw.length) { toast.error(t('csv_no_data')); return; }

    if (useAI) {
      setStep('ai');
      setAiProgress(0);
      setAiStatus('Starting...');
      try {
        const assigned = await aiAssign(raw);
        setPreviewEntries(assigned);
        setStep('preview');
      } catch (e: any) {
        toast.error(t('csv_ai_error') + ': ' + e.message);
        setPreviewEntries(raw.map(e => ({ ...e, group: e.group || defaultGroup, category: e.category || 'Others' })));
        setStep('preview');
      }
    } else {
      const entries = raw.map(e => ({
        ...e,
        group: e.group || defaultGroup,
        category: e.category || defaultCategory || 'Others'
      }));
      setPreviewEntries(entries);
      setStep('preview');
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const doImport = async () => {
    setIsImporting(true);
    try {
      const BATCH = 100;
      let success = 0, failed = 0;
      for (let i = 0; i < previewEntries.length; i += BATCH) {
        const batch = previewEntries.slice(i, i + BATCH);
        const res = await fetch(`${window.location.origin}/api/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ entries: batch })
        });
        if (res.ok) success += batch.length; else failed += batch.length;
      }
      setImportResult({ success, failed });
      setStep('done');
      if (success > 0) { toast.success(t('csv_import_btn', { count: success })); onImportComplete(); }
    } catch (e: any) {
      toast.error(t('csv_import_failed') + ': ' + e.message);
    } finally { setIsImporting(false); }
  };

  const reset = () => {
    setStep('upload'); setCsvHeaders([]); setCsvRows([]); setPreviewEntries([]);
    setImportResult(null); setFileName(''); setAiProgress(0); setAiStatus('');
    setMapping({ date: '', item: '', income: '', expense: '', category: '', group: '', type: '' });
  };

  const ColSelect = ({ label, field, required }: { label: string; field: keyof ColumnMapping; required?: boolean }) => (
    <div>
      <label className="text-[10px] font-bold text-text-muted mb-1 block">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">
        <select value={mapping[field]} onChange={e => setMapping(p => ({ ...p, [field]: e.target.value }))}
          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold appearance-none focus:border-[#7c6aff]/50 outline-none pr-8">
          <option value="">{t('csv_select_col')}</option>
          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div onDragOver={e => { e.preventDefault(); if (isPremium) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (!isPremium) { onOpenPremium?.(); return; } const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => isPremium ? fileInputRef.current?.click() : onOpenPremium?.()}
              className={`w-full h-[160px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${dragOver ? 'border-[#7c6aff] bg-[#7c6aff]/5' : 'border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/50'}`}>
              <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                <Upload size={22} className="text-[#7c6aff]" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-[var(--text-primary)]">{t('csv_upload_title')}</p>
                {!isPremium && (
                  <p className="text-[10px] mt-1 text-amber-400 font-bold flex items-center justify-center gap-1">
                    <Crown size={13} style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 3px #f59e0b88)' }} /> Tap to upgrade and unlock
                  </p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
            <div className="mt-3 bg-[var(--bg-input)] rounded-xl p-3 border border-[var(--border-color)]">
              <p className="text-[10px] font-bold text-text-muted mb-2">{t('csv_format_example')}</p>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="bg-[#7c6aff]/10 text-[#a78bfa]">
                      <th className="px-2 py-1.5 text-left font-bold">date</th>
                      <th className="px-2 py-1.5 text-left font-bold">item</th>
                      <th className="px-2 py-1.5 text-left font-bold">income</th>
                      <th className="px-2 py-1.5 text-left font-bold">expense</th>
                      <th className="px-2 py-1.5 text-left font-bold">group</th>
                      <th className="px-2 py-1.5 text-left font-bold">category</th>
                    </tr>
                  </thead>
                </table>
              </div>
              <p className="text-[9px] text-text-muted mt-1.5">{t('csv_format_hint')}</p>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Map */}
        {step === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-[var(--text-primary)]">{t('csv_col_mapping')}</p>
                <p className="text-[10px] text-text-muted">{fileName} · {csvRows.length} {t('csv_rows')}</p>
              </div>
              <button onClick={reset} className="text-[10px] text-text-muted hover:text-red-400 font-bold">{t('csv_cancel')}</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ColSelect label={t('csv_col_date')} field="date" required />
              <ColSelect label={t('csv_col_item')} field="item" required />
              <ColSelect label={t('csv_col_category')} field="category" />
              <ColSelect label={t('csv_col_group')} field="group" />
            </div>

            {/* Amount mode */}
            <div>
              <p className="text-[10px] font-bold text-text-muted mb-2">{t('csv_amount_format')}</p>
              <div className="flex gap-2">
                {(['split', 'single'] as const).map(m => (
                  <button key={m} onClick={() => setAmountMode(m)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${amountMode === m ? 'bg-[#7c6aff]/15 border-[#7c6aff]/40 text-[#a78bfa]' : 'border-[var(--border-color)] text-text-muted'}`}>
                    {m === 'split' ? t('csv_split_columns') : t('csv_single_column')}
                  </button>
                ))}
              </div>
            </div>

            {amountMode === 'split' ? (
              <div className="grid grid-cols-2 gap-3">
                <ColSelect label={t('csv_col_income')} field="income" />
                <ColSelect label={t('csv_col_expense')} field="expense" />
              </div>
            ) : (
              <div className="space-y-3">
                <ColSelect label={t('csv_col_amount')} field="expense" required />
                <div>
                  <p className="text-[10px] font-bold text-text-muted mb-1.5">{t('csv_default_type')}</p>
                  <div className="flex gap-2">
                    {(['expense', 'income', 'auto'] as const).map(tp => (
                      <button key={tp} onClick={() => setDefaultType(tp)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-bold border transition-all ${defaultType === tp ? 'bg-[#7c6aff]/15 border-[#7c6aff]/40 text-[#a78bfa]' : 'border-[var(--border-color)] text-text-muted'}`}>
                        {tp === 'auto' ? 'Auto' : tp === 'expense' ? '💸 Expense' : '💰 Income'}
                      </button>
                    ))}
                  </div>
                </div>
                {defaultType === 'auto' && <ColSelect label={t('csv_col_type')} field="type" />}
              </div>
            )}

            {/* Default fallbacks */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-text-muted mb-1 block">{t('csv_default_group')}</label>
                <div className="relative">
                  <select value={defaultGroup} onChange={e => setDefaultGroup(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-semibold appearance-none outline-none focus:border-[#7c6aff]/50 pr-8">
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-muted mb-1 block">{t('csv_default_category')}</label>
                <input value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} placeholder="Others"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#7c6aff]/50" />
              </div>
            </div>

            {/* AI Toggle */}
            <div className="bg-[#7c6aff]/5 border border-[#7c6aff]/20 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#a78bfa] flex items-center gap-1.5">
                  <Sparkles size={12} /> {t('csv_ai_toggle')}
                </p>
              </div>
              <button onClick={() => setUseAI(!useAI)}
                className={`w-10 h-6 rounded-full transition-all relative ${useAI ? 'bg-[#7c6aff]' : 'bg-[var(--border-color)]'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${useAI ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            <button onClick={buildPreview}
              className="w-full h-11 rounded-xl bg-[#7c6aff] text-white text-xs font-bold hover:bg-[#a78bfa] transition-all flex items-center justify-center gap-2">
              {useAI ? <><Sparkles size={14} /> {t('csv_preview_with_ai')}</> : t('csv_preview_btn')}
            </button>
          </motion.div>
        )}

        {/* STEP AI: Processing */}
        {step === 'ai' && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 py-8">
            <div className="w-16 h-16 rounded-2xl bg-[#7c6aff]/10 border border-[#7c6aff]/20 flex items-center justify-center">
              <Sparkles size={28} className="text-[#a78bfa] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-[var(--text-primary)]">{t('csv_processing')}</p>
              <p className="text-[11px] text-text-muted mt-1">{aiStatus}</p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[var(--bg-input)] rounded-full h-2">
              <motion.div className="h-2 rounded-full bg-gradient-to-r from-[#7c6aff] to-[#a78bfa]"
                animate={{ width: `${aiProgress}%` }} transition={{ duration: 0.3 }} />
            </div>
            <p className="text-xs font-bold text-[#a78bfa]">{aiProgress}%</p>
          </motion.div>
        )}

        {/* STEP 3: Preview */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black">{t('csv_preview_title')}</p>
                <p className="text-[10px] text-text-muted">{previewEntries.length} {t('csv_preview_showing')}</p>
              </div>
              <button onClick={() => setStep('map')} className="text-[10px] text-[#a78bfa] font-bold">{t('csv_back')}</button>
            </div>

            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {previewEntries.slice(0, 5).map((e, i) => (
                <div key={i} className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${e.income ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{e.item}</p>
                    <p className="text-[9px] text-text-muted">{e.date} · <span className="text-[#a78bfa]">{e.group}</span> · {e.category}</p>
                  </div>
                  <span className={`text-xs font-black font-mono shrink-0 ${e.income ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                    {e.income ? '+' : '-'}{(e.income || e.expense || 0).toLocaleString()}
                  </span>
                </div>
              ))}
              {previewEntries.length > 5 && (
                <p className="text-center text-[10px] text-text-muted py-2">... and {previewEntries.length - 5} {t('csv_more_entries')}</p>
              )}
            </div>

            <button onClick={doImport} disabled={isImporting}
              className="w-full h-11 rounded-xl bg-[#34d399] text-white text-xs font-bold hover:bg-[#6ee7b7] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isImporting ? <><Loader2 size={14} className="animate-spin" /> {t('csv_importing')}</> : t('csv_import_btn', { count: previewEntries.length })}
            </button>
            <button onClick={reset} className="w-full h-9 rounded-xl border border-[var(--border-color)] text-xs text-text-muted font-bold hover:text-red-400 transition-all">
              {t('csv_cancel')}
            </button>
          </motion.div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && importResult && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-[#34d399]/15 border border-[#34d399]/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-[#34d399]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black">{t('csv_done_title')}</p>
              <p className="text-xs text-text-muted mt-1">✅ {importResult.success} succeeded {importResult.failed > 0 ? `· ❌ ${importResult.failed} failed` : ''}</p>
            </div>
            <button onClick={reset} className="px-6 h-10 rounded-xl bg-[#7c6aff] text-white text-xs font-bold hover:bg-[#a78bfa] transition-all">
              {t('csv_import_more')}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};