import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { X, Plus, Search, ArrowUpDown, ArrowUpAZ, ArrowDownZA, Trash2, ChevronDown, Edit2, Check } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

interface CustomizeSettingsProps {
  groups: string[];
  setGroups: (val: string[]) => void;
  newGroup: string;
  setNewGroup: (val: string) => void;
  categories: string[];
  setCategories: (val: string[]) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  saveSettings: () => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  session?: Session | null;
  onRenameComplete?: () => void;
}

type TabType = 'groups' | 'categories';

function ItemList({
  items,
  setItems,
  newItem,
  setNewItem,
  label,
  field,
  session,
  onRenameComplete,
}: {
  items: string[];
  setItems: (val: string[]) => void;
  newItem: string;
  setNewItem: (val: string) => void;
  label: string;
  onRename?: (oldName: string, newName: string) => void;
  field: 'group' | 'category';
  session?: Session | null;
  onRenameComplete?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [isAdding, setIsAdding] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { t } = useLanguage();
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

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handleEditSave = async (oldName: string) => {
    if (!editValue.trim() || editValue === oldName) { setEditingItem(null); return; }
    if (items.includes(editValue.trim())) { setEditingItem(null); return; }
    const newName = editValue.trim();
    setItems(items.map(g => g === oldName ? newName : g));
    setEditingItem(null);
    setEditValue('');
    // Directly call rename API
    if (session) {
      try {
        const res = await fetch(`${window.location.origin}/api/entries/rename`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ field, oldName, newName })
        });
        if (res.ok && onRenameComplete) onRenameComplete();
      } catch (e) { console.error('Rename API failed', e); }
    }
  };

  const filtered = useMemo(() => {
    let result = items.filter(g => g.toLowerCase().includes(search.toLowerCase()));
    if (sortOrder === 'asc') result = [...result].sort((a, b) => a.localeCompare(b));
    else if (sortOrder === 'desc') result = [...result].sort((a, b) => b.localeCompare(a));
    return result;
  }, [items, search, sortOrder]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
          <input type="text" placeholder={t('customize_search_placeholder', { label: label.toLowerCase() })} value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#7c6aff]/50 transition-all" />
        </div>
      </div>

      <div className="flex-1 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-input)] border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[9px] text-text-muted font-mono">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={sortMenuRef}>
              <button onClick={() => setShowSortMenu(!showSortMenu)}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-all text-[10px] font-bold uppercase tracking-wider ${sortOrder !== 'none' ? 'text-[#7c6aff]' : 'text-text-muted'}`}>
                {sortOrder === 'asc' ? <ArrowUpAZ size={12} /> : sortOrder === 'desc' ? <ArrowDownZA size={12} /> : <ArrowUpDown size={12} />}
                Sort <ChevronDown size={10} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 py-1">
                  <button onClick={() => { setSortOrder('asc'); setShowSortMenu(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-primary"><ArrowUpAZ size={14} /> {t('customize_sort_az')}</button>
                  <button onClick={() => { setSortOrder('desc'); setShowSortMenu(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-primary"><ArrowDownZA size={14} /> {t('customize_sort_za')}</button>
                  <button onClick={() => { setSortOrder('none'); setShowSortMenu(false); }} className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)] flex items-center gap-2 text-text-muted"><ArrowUpDown size={14} /> {t('customize_sort_default')}</button>
                </div>
              )}
            </div>
            <button onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#7c6aff]/10 text-[#7c6aff] hover:bg-[#7c6aff]/20 transition-all text-[10px] font-bold uppercase tracking-wider">
              <Plus size={12} /> New
            </button>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-[var(--border-color)]">
              {isAdding && (
                <tr className="bg-[#7c6aff]/5">
                  <td className="px-3 py-2 w-full" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <input autoFocus type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                        placeholder={t('customize_type_placeholder', { label: label.toLowerCase() })}
                        className="flex-1 bg-transparent border-none text-sm outline-none placeholder:text-text-muted py-1"
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }} />
                      <div className="flex items-center gap-1">
                        <button onClick={handleAdd} disabled={!newItem} className="px-2 py-1 bg-[#7c6aff] text-white rounded text-[10px] font-bold disabled:opacity-50">{t('customize_add_btn')}</button>
                        <button onClick={() => { setIsAdding(false); setNewItem(''); }} className="px-2 py-1 bg-[var(--bg-input)] text-text-muted rounded text-[10px] font-bold">{t('btn_cancel')}</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.length > 0 ? filtered.map((g, idx) => (
                <tr key={g} className="hover:bg-[var(--bg-input)]/30 transition-colors">
                  <td className="px-3 py-2.5 text-[10px] text-text-muted border-r border-[var(--border-color)] text-center font-mono w-10">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    {editingItem === g ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="flex-1 bg-[var(--bg-input)] border border-[#7c6aff]/40 rounded-lg px-2 py-1 text-sm outline-none"
                          onKeyDown={e => { if (e.key === 'Enter') handleEditSave(g); if (e.key === 'Escape') setEditingItem(null); }} />
                        <button onClick={() => handleEditSave(g)} className="p-1 text-[#34d399] hover:bg-[#34d399]/10 rounded"><Check size={14} /></button>
                        <button onClick={() => setEditingItem(null)} className="p-1 text-text-muted hover:bg-[var(--bg-input)] rounded"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-primary font-medium">{g}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingItem(g); setEditValue(g); }} className="p-1 text-text-muted hover:text-[#a78bfa] hover:bg-[#7c6aff]/10 rounded transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => setItems(items.filter(x => x !== g))} className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-all"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )) : !isAdding && (
                <tr><td className="px-4 py-10 text-center text-text-muted text-xs italic">{t('customize_no_items', { label: label.toLowerCase() })}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const CustomizeSettings: React.FC<CustomizeSettingsProps> = ({
  groups, setGroups, newGroup, setNewGroup,
  categories, setCategories, newCategory, setNewCategory,
  saveSettings, onRenameGroup, onRenameCategory, session, onRenameComplete,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('groups');

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--bg-input)] p-1 rounded-xl">
        {(['groups', 'categories'] as TabType[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
              activeTab === tab ? 'bg-[#7c6aff] text-white shadow-md' : 'text-text-muted hover:text-text-primary'
            }`}>
            {tab === 'groups' ? t('customize_groups_tab') : t('customize_categories_tab')}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {activeTab === 'groups' ? (
          <ItemList items={groups} setItems={setGroups} newItem={newGroup} setNewItem={setNewGroup} label={t('customize_groups_tab')} onRename={onRenameGroup} field="group" session={session} onRenameComplete={onRenameComplete} />
        ) : (
          <ItemList items={categories} setItems={setCategories} newItem={newCategory} setNewItem={setNewCategory} label={t('customize_categories_tab')} onRename={onRenameCategory} field="category" session={session} onRenameComplete={onRenameComplete} />
        )}
      </div>

      <div className="mt-4">
        <button onClick={saveSettings}
          className="w-full h-11 rounded-xl bg-[#7c6aff] text-white text-sm font-bold hover:bg-[#a78bfa] transition-all shadow-lg shadow-[#7c6aff]/20">
          {t('customize_save_btn')}
        </button>
      </div>
    </div>
  );
};