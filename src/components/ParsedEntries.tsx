import React, { useState } from 'react';
import { EntrySheet } from './EntrySheet';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Edit2 } from 'lucide-react';
import { Entry } from '../types';
import { CATEGORY_ICONS } from '../constants';
import { useLanguage } from '../lib/LanguageContext';

interface ParsedEntriesProps {
  entries: Entry[];
  isSending: boolean;
  sendToNotion: () => void;
  storageMode?: 'app' | 'notion';
  onEdit: (idx: number, updatedEntry: Entry) => void;
  onRemove: (idx: number) => void;
  groups: string[];
  categories: string[];
  onAddGroup: (name: string) => void;
  onAddCategory: (name: string) => void;
}

export const ParsedEntries: React.FC<ParsedEntriesProps> = ({
  entries,
  isSending,
  sendToNotion,
  storageMode = 'app',
  onEdit,
  onRemove,
  groups,
  categories,
  onAddGroup,
  onAddCategory
}) => {
  const { t } = useLanguage();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Entry | null>(null);

  if (entries.length === 0) return null;

  const startEditing = (idx: number, entry: Entry) => {
    setEditingIdx(idx);
    setEditData({ ...entry });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-8"
    >
      <div className="text-[11px] font-semibold tracking-tight text-text-muted mb-3 flex justify-between items-center">
        <span>{t('parsed_title')}</span>
        <span className="text-[9px] bg-[var(--bg-input)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">{t('parsed_tap_to_edit')}</span>
      </div>
      
      <div className="space-y-3 mb-4">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, idx) => {
            const isEditing = editingIdx === idx;
            const isIncome = entry.income !== null;
            const amount = isIncome ? entry.income : entry.expense;
            const icon = CATEGORY_ICONS[entry.category] || '💸';
            


            return (
              <motion.div 
                key={idx} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => startEditing(idx, entry)}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#7c6aff]/30 transition-all group relative overflow-hidden"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${isIncome ? 'bg-[#34d39915]' : 'bg-[#f8717115]'}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate flex items-center gap-2">
                    {entry.item}
                    <Edit2 size={10} className="text-text-muted opacity-40 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono text-text-muted shrink-0">{entry.date}</span>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded text-text-secondary whitespace-nowrap">{entry.group}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded text-text-secondary whitespace-nowrap">{entry.category}</span>
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-bold text-sm shrink-0 ml-2 ${isIncome ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {isIncome ? '+' : '-'}{amount?.toLocaleString()}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <EntrySheet
        open={editingIdx !== null}
        onClose={() => { setEditingIdx(null); setEditData(null); }}
        onSave={entry => { if (editingIdx !== null) { onEdit(editingIdx, entry as Entry); setEditingIdx(null); setEditData(null); } }}
        onDelete={() => { if (editingIdx !== null) { onRemove(editingIdx); setEditingIdx(null); setEditData(null); } }}
        groups={groups}
        categories={categories}
        onAddGroup={onAddGroup}
        onAddCategory={onAddCategory}
        initial={editData ?? undefined}
        mode="edit"
      />

      <button 
        onClick={sendToNotion}
        disabled={isSending}
        className="w-full h-14 rounded-2xl bg-gradient-to-br from-[#7c6aff] to-[#a78bfa] text-white font-bold tracking-wide hover:shadow-[0_12px_32px_rgba(124,106,255,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none"
      >
        {isSending ? <Loader2 size={20} className="animate-spin" /> : storageMode === 'notion' ? `✦ ${t('parsed_send_to_notion')}` : `✦ ${t('parsed_save_entries')}`}
      </button>
    </motion.div>
  );
};