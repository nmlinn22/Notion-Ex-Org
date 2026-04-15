import React from 'react';
import { motion } from 'motion/react';
import { History, Trash2 } from 'lucide-react';
import { Entry } from '../types';

interface HistoryListProps {
  history: Entry[];
  onSeeMore: () => void;
  onDelete: (id: number) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSeeMore, onDelete }) => {
  if (history.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-12"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-caption font-semibold tracking-tight text-text-muted">
          Recent activity
        </div>
        <button
          onClick={onSeeMore}
          className="text-tiny font-bold text-[#a78bfa] hover:underline flex items-center gap-1"
        >
          See More
        </button>
      </div>

      <div className="space-y-1.5">
        {history.slice(0, 3).map((entry) => {
          const isIncome = entry.income && !entry.expense;
          const amount = isIncome ? entry.income : entry.expense;
          return (
            <div key={entry.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isIncome ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-body font-bold truncate">{entry.item}</div>
                <div className="text-caption text-text-secondary mt-0.5 font-medium">{entry.date} · {entry.category}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`font-mono text-sub font-black shrink-0 ${isIncome ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {isIncome ? '+' : '-'}{amount?.toLocaleString()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (entry.id) onDelete(entry.id);
                  }}
                  className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};