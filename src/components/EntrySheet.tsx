import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2, Plus, ChevronRight } from 'lucide-react';
import { Entry } from '../types';
import { CATEGORY_ICONS } from '../constants';
import { useLanguage } from '../lib/LanguageContext';

interface EntrySheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: Partial<Entry>) => void;
  onDelete?: () => void;
  groups: string[];
  categories: string[];
  onAddGroup?: (name: string) => void;
  onAddCategory?: (name: string) => void;
  initial?: Partial<Entry>;
  mode?: 'add' | 'edit';
}

export const EntrySheet: React.FC<EntrySheetProps> = ({
  open, onClose, onSave, onDelete,
  groups, categories, onAddGroup, onAddCategory,
  initial, mode = 'add'
}) => {
  const { t } = useLanguage();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState('');
  const [pickerType, setPickerType] = useState<'group' | 'category' | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (open) {
      if (initial) {
        const isIncome = initial.income != null && initial.income > 0;
        setType(isIncome ? 'income' : 'expense');
        setDate(initial.date ?? new Date().toISOString().slice(0, 10));
        setItem(initial.item ?? '');
        setAmount(String(isIncome ? initial.income : initial.expense ?? ''));
        setGroup(initial.group ?? (groups[0] ?? ''));
        setCategory(initial.category ?? (categories[0] ?? ''));
      } else {
        setType('expense');
        setDate(new Date().toISOString().slice(0, 10));
        setItem(''); setAmount('');
        setGroup(groups[0] ?? '');
        setCategory(categories[0] ?? '');
      }
      setPickerType(null);
      setAddingNew(false);
      setNewName('');
    }
  }, [open]);

  const handleSave = () => {
    if (!item.trim() || !amount) return;
    const num = Number(String(amount).replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;
    onSave({
      ...(initial ?? {}),
      date, item: item.trim(),
      income: type === 'income' ? num : null,
      expense: type === 'expense' ? num : null,
      group, category,
    });
    onClose();
  };

  const handleAddNew = () => {
    const name = newName.trim();
    if (!name) return;
    if (pickerType === 'group') { onAddGroup?.(name); setGroup(name); }
    else { onAddCategory?.(name); setCategory(name); }
    setNewName('');
    setAddingNew(false);
    setPickerType(null);
  };

  const pickerItems = pickerType === 'group' ? groups : categories;
  const pickerValue = pickerType === 'group' ? group : category;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (pickerType) { setPickerType(null); setAddingNew(false); } else onClose(); }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm" />

          {/* Main Sheet */}
          <AnimatePresence>
            {!pickerType && (
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-16 left-0 right-0 z-[130] flex justify-center">
                <div className="w-full max-w-lg bg-[var(--bg-card)] border-t border-[var(--border-color)] rounded-t-3xl shadow-2xl"
                  onClick={e => e.stopPropagation()}>
                  <div className="p-5 pb-32 max-h-[88vh] overflow-y-auto">
                    <div className="w-10 h-1 bg-[var(--border-color)] rounded-full mx-auto mb-5" />
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xl font-black">{mode === 'edit' ? t('entry_edit_title') : t('entry_add_title')}</h3>
                      <div className="flex items-center gap-2">
                        {mode === 'edit' && onDelete && (
                          <button onClick={() => { onDelete(); onClose(); }}
                            className="p-2.5 rounded-xl bg-[#f87171]/10 text-[#f87171]"><Trash2 size={16} /></button>
                        )}
                        <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[var(--bg-input)] text-text-muted"><X size={18} /></button>
                      </div>
                    </div>

                    <div className="flex gap-1 mb-5 bg-[var(--bg-input)] p-1 rounded-xl">
                      {(['expense', 'income'] as const).map(tp => (
                        <button key={tp} onClick={() => setType(tp)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === tp ? (tp === 'expense' ? 'bg-[#f87171] text-white shadow-md' : 'bg-[#34d399] text-white shadow-md') : 'text-text-muted'}`}>
                          {tp === 'expense' ? '− Expense' : '+ Income'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 block">Item name *</label>
                        <input type="text" value={item} onChange={e => setItem(e.target.value)}
                          placeholder="e.g. Lunch, Rent, Salary..."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7c6aff]/50 transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">Amount *</label>
                          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                            className={`w-full bg-[var(--bg-input)] border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all ${type === 'expense' ? 'border-[#f87171]/30 focus:border-[#f87171]/60' : 'border-[#34d399]/30 focus:border-[#34d399]/60'}`} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">Date</label>
                          <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7c6aff]/50 transition-all" />
                        </div>
                      </div>

                      {/* Group */}
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 block">Group</label>
                        <button onClick={() => setPickerType('group')}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between hover:border-[#7c6aff]/40 transition-all">
                          <span className={group ? 'text-text-primary font-medium' : 'text-text-muted'}>{group || t('entry_select_group')}</span>
                          <ChevronRight size={16} className="text-text-muted" />
                        </button>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 block">Category</label>
                        <button onClick={() => setPickerType('category')}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between hover:border-[#7c6aff]/40 transition-all">
                          <span className={category ? 'text-text-primary font-medium' : 'text-text-muted'}>
                            {category ? <>{CATEGORY_ICONS[category] ?? '📦'} {category}</> : t('entry_select_category')}
                          </span>
                          <ChevronRight size={16} className="text-text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
                    <button onClick={handleSave} disabled={!item.trim() || !amount}
                      className="w-full h-12 rounded-xl bg-[#7c6aff] text-white font-bold text-sm hover:bg-[#a78bfa] transition-all shadow-lg shadow-[#7c6aff]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      <Check size={16} /> {mode === 'edit' ? t('btn_save_changes') : t('entry_save')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Picker Sheet */}
          <AnimatePresence>
            {pickerType && (
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[140] flex justify-center"
                onClick={e => e.stopPropagation()}>
                <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
                  <div className="relative flex items-center justify-between px-5 pt-6 pb-3 border-b border-[var(--border-color)]">
                    <div className="w-10 h-1 bg-[var(--border-color)] rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
                    <h3 className="text-base font-black">{pickerType === 'group' ? t('entry_picker_group') : t('entry_picker_category')}</h3>
                    <button onClick={() => { setPickerType(null); setAddingNew(false); }}
                      className="p-2 rounded-xl hover:bg-[var(--bg-input)] text-text-muted"><X size={18} /></button>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {pickerItems.map(it => (
                      <button key={it}
                        onClick={() => { if (pickerType === 'group') setGroup(it); else setCategory(it); setPickerType(null); setAddingNew(false); }}
                        className={`w-full flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]/40 transition-all ${pickerValue === it ? 'bg-[#7c6aff]/10 text-[#a78bfa]' : 'hover:bg-[var(--bg-input)] text-text-primary'}`}>
                        <span className="flex items-center gap-3 text-base font-medium">
                          {pickerType === 'category' && <span className="text-2xl">{CATEGORY_ICONS[it] ?? '📦'}</span>}
                          {it}
                        </span>
                        {pickerValue === it && <div className="w-5 h-5 rounded-full bg-[#7c6aff] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                      </button>
                    ))}

                    {addingNew ? (
                      <div className="flex gap-2 px-5 py-4">
                        <input autoFocus type="text" value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setAddingNew(false); }}
                          placeholder={pickerType === 'group' ? t('entry_group_name_placeholder') : t('entry_category_name_placeholder')}
                          className="flex-1 bg-[var(--bg-input)] border border-[#7c6aff]/40 rounded-xl px-4 py-3 text-sm outline-none" />
                        <button onClick={handleAddNew} className="px-4 py-2 bg-[#7c6aff] text-white rounded-xl text-sm font-bold">Add</button>
                        <button onClick={() => setAddingNew(false)} className="px-3 py-2 bg-[var(--bg-input)] text-text-muted rounded-xl"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingNew(true)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-[#a78bfa] font-bold text-base hover:bg-[#7c6aff]/5 transition-all">
                        <Plus size={18} /> {t('entry_add_new')} {pickerType}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};