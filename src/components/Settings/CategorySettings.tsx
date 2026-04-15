import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Search, ArrowUpDown, ArrowUpAZ, ArrowDownZA, Trash2, ChevronDown } from 'lucide-react';

interface CategorySettingsProps {
  categories: string[];
  setCategories: (val: string[]) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  saveSettings: () => void;
}

export const CategorySettings: React.FC<CategorySettingsProps> = ({
  categories,
  setCategories,
  newCategory,
  setNewCategory,
  saveSettings
}) => {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [isAdding, setIsAdding] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
      setIsAdding(false);
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    let result = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));

    if (sortOrder === 'asc') {
      result = [...result].sort((a, b) => a.localeCompare(b));
    } else if (sortOrder === 'desc') {
      result = [...result].sort((a, b) => b.localeCompare(a));
    }

    return result;
  }, [categories, search, sortOrder]);

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Search Bar - Compact */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-sub outline-none focus:border-[#7c6aff]/50 transition-all"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)] flex flex-col">
        {/* Notion-like Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-input)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="text-tiny font-bold uppercase tracking-wider text-text-muted">Categories</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-tiny text-text-muted font-mono">
              {filteredAndSortedCategories.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Sort Dropdown */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-all text-tiny font-bold uppercase tracking-wider ${sortOrder !== 'none' ? 'text-[#7c6aff]' : 'text-text-muted'}`}
              >
                {sortOrder === 'asc' ? <ArrowUpAZ size={12} /> : sortOrder === 'desc' ? <ArrowDownZA size={12} /> : <ArrowUpDown size={12} />}
                Sort
                <ChevronDown size={10} />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={() => { setSortOrder('asc'); setShowSortMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sub hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-primary"
                  >
                    <ArrowUpAZ size={14} /> A → Z
                  </button>
                  <button
                    onClick={() => { setSortOrder('desc'); setShowSortMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sub hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-primary"
                  >
                    <ArrowDownZA size={14} /> Z → A
                  </button>
                  <button
                    onClick={() => { setSortOrder('none'); setShowSortMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sub hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-muted"
                  >
                    <ArrowUpDown size={14} /> Default
                  </button>
                </div>
              )}
            </div>

            {/* New Button */}
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#7c6aff]/10 text-[#7c6aff] hover:bg-[#7c6aff]/20 transition-all text-tiny font-bold uppercase tracking-wider"
            >
              <Plus size={12} />
              New
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[var(--border-color)]">
              {/* Inline Add Row */}
              {isAdding && (
                <tr className="bg-[#7c6aff]/5">
                  <td className="px-3 py-2 w-full" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Type category name..."
                        className="flex-1 bg-transparent border-none text-body outline-none placeholder:text-text-muted py-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory();
                          if (e.key === 'Escape') setIsAdding(false);
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleAddCategory}
                          disabled={!newCategory}
                          className="px-2 py-1 bg-[#7c6aff] text-white rounded text-tiny font-bold disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setIsAdding(false); setNewCategory(''); }}
                          className="px-2 py-1 bg-[var(--bg-input)] text-text-muted rounded text-tiny font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {filteredAndSortedCategories.length > 0 ? (
                filteredAndSortedCategories.map((c, idx) => (
                  <tr key={c} className="hover:bg-[var(--bg-input)]/30 transition-colors group">
                    <td className="px-3 py-2.5 text-tiny text-text-muted border-r border-[var(--border-color)] text-center font-mono w-10">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 flex items-center justify-between">
                      <span className="text-body text-text-primary font-medium">{c}</span>
                      <button
                        onClick={() => setCategories(categories.filter(x => x !== c))}
                        className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-all opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : !isAdding && (
                <tr>
                  <td className="px-4 py-10 text-center text-text-muted text-sub italic">
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button - Fixed at bottom of component */}
      <div className="mt-4">
        <button
          onClick={saveSettings}
          className="w-full h-11 rounded-xl bg-[#7c6aff] text-white text-body font-bold hover:bg-[#a78bfa] transition-all shadow-lg shadow-[#7c6aff]/20"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};