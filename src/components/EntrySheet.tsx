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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setConfirmDelete(false);
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
                <div className="w-full bg-[var(--bg-card)] border-t border-[var(--border-color)] rounded-t-3xl shadow-2xl"
                  onClick={e => e.stopPropagation()}>
                  <div className="px-4 py-4 pb-32 max-h-[88vh] overflow-y-auto">
                    <div className="w-10 h-1 bg-[var(--border-color)] rounded-full mx-auto mb-4" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-black">{mode === 'edit' ? t('entry_edit_title') : t('entry_add_title')}</h3>
                      <div className="flex items-center gap-2">
                        {mode === 'edit' && onDelete && (
                          <button onClick={() => setConfirmDelete(true)}
                            className="p-2.5 rounded-xl bg-[#f87171]/10 text-[#f87171] hover:bg-[#f87171]/20 transition-all"><Trash2 size={16} /></button>
                        )}
                        <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-[var(--bg-input)] text-text-muted"><X size={18} /></button>
                      </div>
                    </div>

                    <div className="flex gap-1 mb-4 bg-[var(--bg-input)] p-1 rounded-xl">
                      {(['expense', 'income'] as const).map(tp => (
                        <button key={tp} onClick={() => setType(tp)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === tp ? (tp === 'expense' ? 'bg-[#f87171] text-white shadow-md' : 'bg-[#34d399] text-white shadow-md') : 'text-text-muted'}`}>
                          {tp === 'expense' ? '− Expense' : '+ Income'}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 block">Item name *</label>
                        <input type="text" value={item} onChange={e => setItem(e.target.value)}
                          placeholder="e.g. Lunch, Rent, Salary..."
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-[#7c6aff]/50 transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">Amount *</label>
                          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                            className={`w-full bg-[var(--bg-input)] border rounded-lg px-3 py-2.5 text-xs font-mono outline-none transition-all ${type === 'expense' ? 'border-[#f87171]/30 focus:border-[#f87171]/60' : 'border-[#34d399]/30 focus:border-[#34d399]/60'}`} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-text-muted mb-1.5 block">Date</label>
                          <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-[#7c6aff]/50 transition-all" />
                        </div>
                      </div>

                      {/* Group */}
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center justify-between">
                          <span>Group</span>
                          <button onClick={() => setPickerType('group')} className="text-[10px] text-[#a78bfa] font-semibold flex items-center gap-1 px-2 py-0.5 bg-[#7c6aff]/10 rounded-md hover:bg-[#7c6aff]/20 transition-all">+ Add New</button>
                        </label>
                        <button onClick={() => setPickerType('group')}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-left flex items-center justify-between hover:border-[#7c6aff]/40 transition-all">
                          <span className={group ? 'text-text-primary font-medium' : 'text-text-muted'}>{group || 'Select...'}</span>
                          <ChevronRight size={16} className="text-text-muted" />
                        </button>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center justify-between">
                          <span>Category</span>
                          <button onClick={() => setPickerType('category')} className="text-[10px] text-[#a78bfa] font-semibold flex items-center gap-1 px-2 py-0.5 bg-[#7c6aff]/10 rounded-md hover:bg-[#7c6aff]/20 transition-all">+ Add New</button>
                        </label>
                        <button onClick={() => setPickerType('category')}
                          className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-left flex items-center justify-between hover:border-[#7c6aff]/40 transition-all">
                          <span className={category ? 'text-text-primary font-medium' : 'text-text-muted'}>
                            {category ? <>{CATEGORY_ICONS[category] ?? '📦'} {category}</> : 'Select...'}
                          </span>
                          <ChevronRight size={16} className="text-text-muted" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
                    <button onClick={handleSave} disabled={!item.trim() || !amount}
                      className="w-full h-11 rounded-lg bg-[#7c6aff] text-white font-bold text-xs hover:bg-[#a78bfa] transition-all shadow-lg shadow-[#7c6aff]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
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
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => { setPickerType(null); setAddingNew(false); }}
                  className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col w-[90%] max-w-md"
                  style={{ maxHeight: '80vh' }}
                  onClick={e => e.stopPropagation()}>
                  <div className="relative flex items-center justify-between px-4 pt-4 pb-2.5 border-b border-[var(--border-color)] flex-shrink-0">
                    <h3 className="text-sm font-black">{pickerType === 'group' ? t('entry_picker_group') : t('entry_picker_category')}</h3>
                    <button onClick={() => { setPickerType(null); setAddingNew(false); }}
                      className="p-2 rounded-xl hover:bg-[var(--bg-input)] text-text-muted"><X size={18} /></button>
                  </div>

                  <div className="overflow-y-auto flex-1 min-h-0">
                    {pickerItems.map(it => (
                      <button key={it}
                        onClick={() => { if (pickerType === 'group') setGroup(it); else setCategory(it); setPickerType(null); setAddingNew(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]/40 transition-all ${pickerValue === it ? 'bg-[#7c6aff]/10 text-[#a78bfa]' : 'hover:bg-[var(--bg-input)] text-text-primary'}`}>
                        <span className="flex items-center gap-2.5 text-sm font-medium">
                          {pickerType === 'category' && <span className="text-lg">{CATEGORY_ICONS[it] ?? '📦'}</span>}
                          {it}
                        </span>
                        {pickerValue === it && <div className="w-5 h-5 rounded-full bg-[#7c6aff] flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                      </button>
                    ))}

                    {addingNew ? (
                      <div className="flex gap-2 px-4 py-3 border-b border-[var(--border-color)]/40 bg-[var(--bg-input)]/30">
                        <input autoFocus type="text" value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); if (e.key === 'Escape') setAddingNew(false); }}
                          placeholder={pickerType === 'group' ? t('entry_group_name_placeholder') : t('entry_category_name_placeholder')}
                          className="flex-1 bg-[var(--bg-card)] border border-[#7c6aff]/40 rounded-lg px-3 py-2.5 text-xs outline-none" />
                        <button onClick={handleAddNew} className="px-3.5 py-2.5 bg-[#7c6aff] text-white rounded-lg text-[11px] font-bold">Add</button>
                        <button onClick={() => setAddingNew(false)} className="px-2.5 py-2.5 bg-[var(--bg-input)] text-text-muted rounded-lg"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingNew(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[#a78bfa] font-bold text-xs hover:bg-[#7c6aff]/5 transition-all border-t border-[var(--border-color)]">
                        <Plus size={14} /> {t('entry_add_new')} {pickerType}
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {confirmDelete && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setConfirmDelete(false)}
                  className="fixed inset-0 z-[145] bg-black/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-w-sm w-[90%]"
                  onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <h3 className="text-base font-black mb-2">Delete Entry?</h3>
                    <p className="text-xs text-text-muted mb-6">This action cannot be undone. Are you sure you want to delete this entry?</p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmDelete(false)}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--bg-input)] text-text-primary font-semibold text-xs hover:bg-[var(--bg-input)]/80 transition-all">
                        Cancel
                      </button>
                      <button onClick={() => { onDelete?.(); onClose(); setConfirmDelete(false); }}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#f87171] text-white font-semibold text-xs hover:bg-[#ef4444] transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};