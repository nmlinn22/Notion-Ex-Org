import React, { useState, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trash2, AlertTriangle, Filter, Download } from 'lucide-react';
import { EntrySheet } from './EntrySheet';
import { CATEGORY_ICONS } from '../constants';
import { Entry } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface DataTableProps {
  entries: Entry[];
  groups: string[];
  categories: string[];
  onDelete: (id: number) => void;
  onEdit: (id: number, updated: Partial<Entry>) => void;
  onAddGroup?: (name: string) => void;
  onAddCategory?: (name: string) => void;
  storageMode?: 'app' | 'notion';
  session?: Session | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(n: number | null | undefined) {
  if (!n) return '—';
  return n.toLocaleString();
}

function exportCSV(rows: Entry[], filename: string) {
  const headers = ['Date', 'Item', 'Income', 'Expense', 'Group', 'Category'];
  const lines = [
    headers.join(','),
    ...rows.map(e => [
      e.date ?? '',
      `"${(e.item ?? '').replace(/"/g, '""')}"`,
      e.income ?? '',
      e.expense ?? '',
      `"${(e.group ?? '').replace(/"/g, '""')}"`,
      `"${(e.category ?? '').replace(/"/g, '""')}"`,
    ].join(','))
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function exportXLSX(rows: Entry[], filename: string) {
  const { utils, writeFile } = await import('xlsx');
  const data = rows.map(e => ({
    Date: e.date ?? '',
    Item: e.item ?? '',
    Income: e.income && e.income > 0 ? e.income : '',
    Expense: e.expense && e.expense > 0 ? e.expense : '',
    Group: e.group ?? '',
    Category: e.category ?? '',
  }));
  const ws = utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Entries');
  writeFile(wb, filename + '.xlsx');
}

async function exportPDF(rows: Entry[], filename: string, totalIncome: number, totalExpense: number, userEmail?: string, userName?: string) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Convert logo to faded image via canvas
  let watermarkB64: string | null = null;
  try {
    const resp = await fetch('/inlogo.png');
    const blob = await resp.blob();
    const imgUrl = URL.createObjectURL(blob);
    await new Promise<void>(res => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.globalAlpha = 0.10; // 10% opacity
        ctx.drawImage(img, 0, 0);
        watermarkB64 = canvas.toDataURL('image/png').split(',')[1];
        URL.revokeObjectURL(imgUrl);
        res();
      };
      img.src = imgUrl;
    });
  } catch (_) { }

  const drawWatermark = () => {
    if (!watermarkB64) return;
    const size = 90;
    const x = (pageW - size) / 2;
    const y = (pageH - size) / 2;
    doc.addImage('data:image/png;base64,' + watermarkB64, 'PNG', x, y, size, size);
  };

  // Top-right corner logo (full opacity, small)
  let logoB64: string | null = null;
  try {
    const resp2 = await fetch('/inlogo.png');
    const blob2 = await resp2.blob();
    logoB64 = await new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob2);
    });
  } catch (_) { }

  const drawCornerLogo = () => {
    if (!logoB64) return;
    const size = 14;
    doc.addImage('data:image/png;base64,' + logoB64, 'PNG', pageW - size - 10, 8, size, size);
  };

  // Draw watermark + corner logo on first page
  drawWatermark();
  drawCornerLogo();

  // Title
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Notion-Ex Tracker', 14, 18);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Exported: ${new Date().toLocaleDateString()}   |   Entries: ${rows.length}`, 14, 25);
  doc.text(`Total Income: ${totalIncome.toLocaleString()}   |   Total Expense: ${totalExpense.toLocaleString()}   |   Balance: ${(totalIncome - totalExpense).toLocaleString()}`, 14, 31);
  if (userName || userEmail) {
    doc.setFontSize(8);
    doc.setTextColor(130);
    const userLine = [userName, userEmail].filter(Boolean).join('   |   ');
    doc.text(userLine, 14, 37);
  }

  autoTable(doc, {
    startY: (userName || userEmail) ? 43 : 36,
    head: [['Date', 'Item', 'Income', 'Expense', 'Group', 'Category']],
    body: rows.map(e => [
      e.date ?? '',
      e.item ?? '',
      e.income ? e.income.toLocaleString() : '',
      e.expense ? e.expense.toLocaleString() : '',
      e.group ?? '',
      e.category ?? '',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [124, 106, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 255] },
    columnStyles: {
      2: { halign: 'right', textColor: [52, 211, 153] },
      3: { halign: 'right', textColor: [248, 113, 113] },
    },
    didDrawPage: () => {
      drawWatermark();
      drawCornerLogo();
    },
  });

  doc.save(filename + '.pdf');
}

export const DataTable: React.FC<DataTableProps> = ({ entries, groups, categories, onDelete, onEdit, onAddGroup, onAddCategory, storageMode = 'app', session }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    return [...new Set(entries.map(e => e.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (search && !e.item?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterYear !== 'all' && !e.date?.startsWith(filterYear)) return false;
      if (filterMonth !== 'all' && e.date?.slice(5, 7) !== String(Number(filterMonth)).padStart(2, '0')) return false;
      if (filterGroup !== 'all' && e.group !== filterGroup) return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterType === 'income' && !(e.income && e.income > 0)) return false;
      if (filterType === 'expense' && !(e.expense && e.expense > 0)) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, search, filterYear, filterMonth, filterGroup, filterCategory, filterType]);

  const totalIncome = filtered.reduce((s, e) => s + (e.income || 0), 0);
  const totalExpense = filtered.reduce((s, e) => s + (e.expense || 0), 0);
  const activeFilterCount = [filterMonth !== 'all', filterYear !== 'all', filterGroup !== 'all', filterCategory !== 'all', filterType !== 'all'].filter(Boolean).length;

  const pendingEntry = entries.find(e => e.id === pendingDeleteId);

  const exportFilename = () => {
    const parts = ['notion-ex'];
    if (filterYear !== 'all') parts.push(filterYear);
    if (filterMonth !== 'all') parts.push(MONTHS[Number(filterMonth) - 1]);
    if (filterGroup !== 'all') parts.push(filterGroup.replace(/\s+/g, '-'));
    return parts.join('_');
  };

  return (
    <div className="flex flex-col">

      {/* Search + Filter + Export */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
          <input type="text" placeholder={t('search_placeholder')} value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-8 pr-3 py-2 text-sub outline-none focus:border-[#7c6aff]/50 transition-all" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sub font-bold transition-all ${activeFilterCount > 0 ? 'bg-[#7c6aff]/10 border-[#7c6aff]/30 text-[#a78bfa]' : 'bg-[var(--bg-input)] border-[var(--border-color)] text-text-muted'}`}>
          <Filter size={13} />
          {activeFilterCount > 0 && <span className="bg-[#7c6aff] text-white rounded-full w-4 h-4 flex items-center justify-center text-tiny">{activeFilterCount}</span>}
        </button>
        <div className="relative">
          <button onClick={() => setShowExport(!showExport)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-[var(--bg-input)] border-[var(--border-color)] text-text-muted text-sub font-bold transition-all hover:border-[#7c6aff]/40 hover:text-[#a78bfa]">
            <Download size={13} />
          </button>
          <AnimatePresence>
            {showExport && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowExport(false)} className="fixed inset-0 z-40" />
                <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden min-w-[140px]">
                  <div className="px-3 py-2 border-b border-[var(--border-color)]">
                    <p className="text-tiny font-black text-text-muted uppercase tracking-wide">{t('export_rows', { count: filtered.length })}</p>
                  </div>
                  {[
                    { label: 'Excel (.xlsx)', icon: '📊', action: () => { exportXLSX(filtered, exportFilename()); setShowExport(false); } },
                    { label: 'CSV (.csv)', icon: '📄', action: () => { exportCSV(filtered, exportFilename()); setShowExport(false); } },
                    { label: 'PDF (.pdf)', icon: '📋', action: () => { exportPDF(filtered, exportFilename(), totalIncome, totalExpense, session?.user?.email, session?.user?.user_metadata?.display_name); setShowExport(false); } },
                  ].map(opt => (
                    <button key={opt.label} onClick={opt.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-body text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-all">
                      <span>{opt.icon}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-tiny font-bold text-text-muted uppercase mb-1 block">{t('filter_year')}</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sub outline-none">
                  <option value="all">{t('filter_all')}</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-tiny font-bold text-text-muted uppercase mb-1 block">{t('filter_month')}</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sub outline-none">
                  <option value="all">{t('filter_all')}</option>
                  {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-tiny font-bold text-text-muted uppercase mb-1 block">{t('filter_type')}</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sub outline-none">
                  <option value="all">{t('filter_all')}</option>
                  <option value="income">{t('filter_income')}</option>
                  <option value="expense">{t('filter_expense')}</option>
                </select>
              </div>
              <div>
                <label className="text-tiny font-bold text-text-muted uppercase mb-1 block">{t('filter_group')}</label>
                <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sub outline-none">
                  <option value="all">{t('filter_all')}</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-tiny font-bold text-text-muted uppercase mb-1 block">{t('filter_category')}</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sub outline-none">
                  <option value="all">{t('filter_all')}</option>
                  {categories.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] ?? '📦'} {c}</option>)}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <div className="col-span-2">
                  <button onClick={() => { setFilterMonth('all'); setFilterYear('all'); setFilterGroup('all'); setFilterCategory('all'); setFilterType('all'); }}
                    className="w-full py-1.5 rounded-lg bg-[var(--bg-input)] text-[#f87171] text-sub font-bold">{t('btn_clear_filters')}</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-2 py-2 text-center">
          <p className="text-tiny text-text-muted font-bold uppercase">{t('table_header_entries')}</p>
          <p className="text-body font-black">{filtered.length}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[#34d399]/20 rounded-xl px-2 py-2 text-center">
          <p className="text-tiny text-text-muted font-bold uppercase">{t('dashboard_income')}</p>
          <p className="text-body font-black text-[#34d399]">{totalIncome >= 1000000 ? (totalIncome / 1000000).toFixed(1) + 'M' : totalIncome >= 1000 ? (totalIncome / 1000).toFixed(0) + 'K' : totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[#f87171]/20 rounded-xl px-2 py-2 text-center">
          <p className="text-tiny text-text-muted font-bold uppercase">{t('dashboard_expense')}</p>
          <p className="text-body font-black text-[#f87171]">{totalExpense >= 1000000 ? (totalExpense / 1000000).toFixed(1) + 'M' : totalExpense >= 1000 ? (totalExpense / 1000).toFixed(0) + 'K' : totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col flex-1">
        {/* Rows */}
        <div className="divide-y divide-[var(--border-color)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <p className="text-2xl mb-1">🗂️</p>
              <p className="text-sub italic">{t('no_entries_found')}</p>
            </div>
          ) : filtered.map(entry => {
            const isIncome = entry.income && entry.income > 0;
            const amount = isIncome ? entry.income : entry.expense;
            return (
              <div key={entry.id} onClick={() => storageMode === 'app' && setEditingEntry({ ...entry })}
                className={`px-3 py-3 hover:bg-[var(--bg-input)]/40 transition-all ${storageMode === 'app' ? 'cursor-pointer' : 'cursor-default'}`}>
                {/* Row 1: Item + Amount */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isIncome ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
                    <p className="text-body font-semibold truncate text-text-primary">{entry.item}</p>
                  </div>
                  <p className={`text-body font-black font-mono shrink-0 ${isIncome ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                    {isIncome ? '+' : '−'}{fmt(amount)}
                  </p>
                </div>

                {/* Row 2: Category + Group + Date */}
                <div className="flex items-center justify-between text-caption text-text-muted pl-2.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="truncate">
                      {entry.category ? `${CATEGORY_ICONS[entry.category] ?? ''}  ${entry.category}` : '—'}
                    </span>
                    <span className="truncate">{entry.group ?? '—'}</span>
                  </div>
                  <span className="shrink-0 ml-2">{entry.date?.slice(5)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EntrySheet
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={entry => { if (editingEntry?.id) onEdit(editingEntry.id, entry); }}
        onDelete={() => { if (editingEntry?.id) setPendingDeleteId(editingEntry.id); }}
        groups={groups}
        categories={categories}
        onAddGroup={onAddGroup}
        onAddCategory={onAddCategory}
        initial={editingEntry ?? undefined}
        mode="edit"
      />

      {/* Delete Confirm */}
      <AnimatePresence>
        {pendingDeleteId !== null && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500"><AlertTriangle size={28} /></div>
                <div>
                  <h3 className="text-lg font-bold">{t('delete_entry_title')}</h3>
                  {pendingEntry && <p className="text-body text-text-muted mt-1">This will delete "{pendingEntry.item}".</p>}
                </div>
                <div className="w-full flex gap-2">
                  <button onClick={() => setPendingDeleteId(null)} className="flex-1 h-11 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold text-body">{t('btn_cancel')}</button>
                  <button onClick={() => { onDelete(pendingDeleteId!); setPendingDeleteId(null); }}
                    className="flex-1 h-11 rounded-xl bg-red-500 text-white font-bold text-body hover:bg-red-600 transition-all">{t('btn_delete')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};