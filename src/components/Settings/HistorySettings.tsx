import React, { useState, useMemo } from 'react';
import { Trash2, Search, Filter, CheckSquare, Square, ChevronDown, Loader2 } from 'lucide-react';
import { Entry } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../lib/LanguageContext';

interface HistorySettingsProps {
  history: Entry[];
  onDelete: (id: number) => void;
  onBulkDelete: (ids: number[]) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalCount: number;
}

type SortType = 'day' | 'month' | 'year' | 'newest';

export const HistorySettings: React.FC<HistorySettingsProps> = ({
  history,
  onDelete,
  onBulkDelete,
  onLoadMore,
  hasMore,
  isLoadingMore,
  totalCount
}) => {
  const [search, setSearch] = useState('');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const { t } = useLanguage();

  const filteredHistory = useMemo(() => {
    let result = history.filter(item =>
      item.item.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.group.toLowerCase().includes(search.toLowerCase())
    );

    if (sortType === 'day') {
      result.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortType === 'month') {
      result.sort((a, b) => {
        const monthA = a.date.substring(0, 7);
        const monthB = b.date.substring(0, 7);
        return monthB.localeCompare(monthA);
      });
    } else if (sortType === 'year') {
      result.sort((a, b) => {
        const yearA = a.date.substring(0, 4);
        const yearB = b.date.substring(0, 4);
        return yearB.localeCompare(yearA);
      });
    } else {
      result.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    return result;
  }, [history, search, sortType]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHistory.map(item => item.id as number));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(t('history_delete_confirm', { count: selectedIds.length }))) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder={t('history_search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-body outline-none focus:border-[#7c6aff]/50 transition-all"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-caption font-bold hover:bg-[var(--bg-hover)] transition-all"
              >
                <Filter size={14} />
                {t('history_sort_prefix')} {sortType === 'newest' ? t('history_sort_newest') : sortType === 'day' ? t('history_sort_day') : sortType === 'month' ? t('history_sort_month') : t('history_sort_year')}
                <ChevronDown size={12} className={`transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 top-full mt-1 w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden"
                    >
                      {(['newest', 'day', 'month', 'year'] as SortType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => { setSortType(type); setShowSortMenu(false); }}
                          className={`w-full text-left px-3 py-2 text-caption hover:bg-[var(--bg-input)] transition-colors ${sortType === type ? 'text-[#7c6aff] font-bold' : 'text-text-muted'}`}
                        >
                          {type === 'newest' ? t('history_sort_newest') : type === 'day' ? t('history_sort_day') : type === 'month' ? t('history_sort_month') : t('history_sort_year')}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-caption font-bold hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 size={14} />
                {t('history_delete_bulk_btn')} ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Loaded / Total count */}
            {totalCount > 0 && (
              <span className="text-tiny text-text-muted font-medium">
                {history.length} / {totalCount}
              </span>
            )}
            <button
              onClick={toggleSelectAll}
              className="text-tiny font-bold text-[#7c6aff] hover:underline"
            >
              {selectedIds.length === filteredHistory.length ? t('history_deselect_all') : t('history_select_all')}
            </button>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[30px_1fr_80px_60px] gap-2 px-3 py-2 border-b border-[var(--border-color)] text-tiny font-black text-text-muted uppercase tracking-wider">
        <div className="flex justify-center">
          <button onClick={toggleSelectAll}>
            {selectedIds.length === filteredHistory.length && filteredHistory.length > 0
              ? <CheckSquare size={14} className="text-[#7c6aff]" />
              : <Square size={14} />}
          </button>
        </div>
        <div>{t('history_col_item_date')}</div>
        <div className="text-right">{t('history_col_category')}</div>
        <div className="text-right">{t('history_col_amount')}</div>
      </div>

      {/* Table Body */}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
        {filteredHistory.length > 0 ? filteredHistory.map((entry) => {
          const isIncome = entry.income && !entry.expense;
          const amount = isIncome ? entry.income : entry.expense;
          const isSelected = selectedIds.includes(entry.id as number);

          return (
            <div
              key={entry.id}
              onClick={() => toggleSelect(entry.id as number)}
              className={`grid grid-cols-[30px_1fr_80px_60px] gap-2 px-3 py-3 rounded-xl border transition-all cursor-pointer group ${isSelected
                  ? 'bg-[#7c6aff]/5 border-[#7c6aff]/30'
                  : 'bg-[var(--bg-input)] border-transparent hover:border-[var(--border-color)]'
                }`}
            >
              <div className="flex justify-center items-center">
                {isSelected
                  ? <CheckSquare size={14} className="text-[#7c6aff]" />
                  : <Square size={14} className="text-text-muted group-hover:text-text-primary" />}
              </div>
              <div className="min-w-0">
                <div className="text-sub font-bold truncate text-text-primary">{entry.item}</div>
                <div className="text-tiny text-text-muted mt-0.5">{entry.date}</div>
              </div>
              <div className="text-right flex flex-col justify-center">
                <span className="text-tiny bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-color)] text-text-secondary truncate">
                  {entry.category}
                </span>
              </div>
              <div className="text-right flex flex-col justify-center">
                <div className={`font-mono text-caption font-black ${isIncome ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {isIncome ? '+' : '-'}{amount?.toLocaleString()}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-10 text-text-muted text-sub italic">{t('history_empty')}</div>
        )}

        {/* Load More Button — hidden in search mode (results already fully loaded) */}
        {hasMore && !search && (
          <div className="pt-2 pb-1">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-caption font-bold text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoadingMore
                ? <><Loader2 size={14} className="animate-spin" /> {t('loading')}</>
                : <>{t('btn_load_more', { count: totalCount - history.length })}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};