import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronRight, ChevronDown, Wallet, Settings, ArrowUp, ArrowDown, LayoutGrid } from 'lucide-react';
import { CATEGORY_ICONS } from '../constants';
import { Budget } from '../hooks/useBudget';
import { useLanguage } from '../lib/LanguageContext';

interface DashboardProps {
  session: Session | null;
  storageMode: 'app' | 'notion';
  budgets?: Budget[];
  onOpenSettings?: () => void;
  refreshKey?: number;
}

interface CategoryData { income: number; expense: number; entries: any[]; }
interface GroupData { income: number; expense: number; categories: Record<string, CategoryData>; }
interface DrillData { byGroup: Record<string, GroupData>; totalIncome: number; totalExpense: number; }
type ViewLevel = 'summary' | 'group' | 'category';
type MainTab = 'group' | 'trend';

const COLORS = ['#7c6aff', '#34d399', '#f472b6', '#fb923c', '#60a5fa', '#a78bfa', '#4ade80', '#fbbf24', '#f87171', '#38bdf8'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

function fullFmt(n: number) {
  return n.toLocaleString();
}

function Dropdown<T extends string | number | null>({
  value, options, labelFn, onChange, align = 'left',
}: {
  value: T; options: T[]; labelFn: (v: T) => string;
  onChange: (v: T) => void; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-sub font-semibold text-[var(--text-primary)] hover:border-[#7c6aff]/50 transition-all"
      >
        {labelFn(value)}
        <ChevronDown size={11} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`absolute top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden min-w-[100px] ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              {options.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-sub font-medium transition-colors whitespace-nowrap ${opt === value ? 'bg-[#7c6aff]/15 text-[#a78bfa]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                >
                  {labelFn(opt)}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export const Dashboard: React.FC<DashboardProps> = ({ session, storageMode, budgets = [] as Budget[], onOpenSettings, refreshKey = 0 }) => {
  const { t } = useLanguage();
  const now = new Date();
  const [month, setMonth] = useState<number | null>(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DrillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('group');
  const [trendData, setTrendData] = useState<any>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [catGroupFilter, setCatGroupFilter] = useState<string>('__all__');
  const [groupGroupFilter, setGroupGroupFilter] = useState<string>('__all__');
  const [level, setLevel] = useState<ViewLevel>('summary');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const params = month !== null ? `year=${year}&month=${month + 1}` : `year=${year}`;
      const res = await fetch(`${window.location.origin}/api/entries/drilldown/groups?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [session, year, month]);

  // Reset navigation only when storageMode changes (not on year/month change)
  useEffect(() => {
    if (storageMode === 'app') {
      setLevel('summary'); setSelectedGroup(null); setSelectedCategory(null);
    }
  }, [storageMode]);

  // Refetch data when year/month/refreshKey changes — do NOT reset navigation level
  useEffect(() => {
    if (storageMode === 'app') {
      fetchData();
    }
  }, [fetchData, storageMode, refreshKey]);

  const fetchTrend = useCallback(async () => {
    if (!session) return;
    setTrendLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/entries/summary?year=${year}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) setTrendData(await res.json());
    } catch (e) { console.error(e); }
    finally { setTrendLoading(false); }
  }, [session, year]);

  useEffect(() => {
    if (storageMode === 'app' && mainTab === 'trend') {
      fetchTrend();
    }
  }, [fetchTrend, storageMode, mainTab]);

  useEffect(() => {
    setLevel('summary'); setSelectedGroup(null); setSelectedCategory(null);
  }, [mainTab]);

  if (storageMode !== 'app') return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-8 pt-20">
      <div className="text-4xl mb-4">📊</div>
      <p className="text-text-muted text-body">{t('dashboard_app_only')}</p>
    </div>
  );

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const balance = totalIncome - totalExpense;
  const [customSortOrder, setCustomSortOrder] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dashboard_group_order') || '[]');
    } catch { return []; }
  });
  const [isSorting, setIsSorting] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard_group_order', JSON.stringify(customSortOrder));
  }, [customSortOrder]);

  const moveGroup = (idx: number, direction: 'up' | 'down') => {
    const entries = [...groupEntries.map(([g]) => g)];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= entries.length) return;

    // Swap
    const temp = entries[idx];
    entries[idx] = entries[targetIdx];
    entries[targetIdx] = temp;

    setCustomSortOrder(entries);
  };

  const groupEntries = useMemo(() => {
    const entries = (Object.entries(data?.byGroup ?? {}) as [string, GroupData][]);
    if (customSortOrder.length > 0) {
      return [...entries].sort((a, b) => {
        const idxA = customSortOrder.indexOf(a[0]);
        const idxB = customSortOrder.indexOf(b[0]);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return Math.max(b[1].expense, b[1].income) - Math.max(a[1].expense, a[1].income);
      });
    }
    return entries.sort((a, b) => Math.max(b[1].expense, b[1].income) - Math.max(a[1].expense, a[1].income));
  }, [data, customSortOrder]);

  const allCategories = useMemo(() => {
    const map: Record<string, { expense: number; income: number; group: string }> = {};
    (Object.entries(data?.byGroup ?? {}) as [string, GroupData][]).forEach(([group, gd]: [string, GroupData]) => {
      (Object.entries(gd.categories) as [string, CategoryData][]).forEach(([cat, cd]: [string, CategoryData]) => {
        if (!map[cat]) map[cat] = { expense: 0, income: 0, group };
        map[cat].expense += cd.expense;
        map[cat].income += cd.income;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].expense - a[1].expense);
  }, [data]);

  const groupNames = ['__all__', ...Object.keys(data?.byGroup ?? {})];
  const filteredCategories = catGroupFilter === '__all__'
    ? allCategories
    : allCategories.filter(([, cd]) => cd.group === catGroupFilter);

  // Donut chart data — changes based on active tab
  const donutData = useMemo(() => {
    if (mainTab === 'group') {
      const filtered = groupGroupFilter === '__all__'
        ? groupEntries
        : groupEntries.filter(([g]) => g === groupGroupFilter);
      const entries = filtered.filter(([, gd]: [string, GroupData]) => gd.expense > 0);
      if (entries.length === 0) return [{ name: 'No data', value: 1 }];
      return entries.map(([g, gd]: [string, GroupData]) => ({ name: g, value: gd.expense }));
    } else {
      const cats = catGroupFilter === '__all__'
        ? allCategories
        : allCategories.filter(([, cd]) => cd.group === catGroupFilter);
      const entries = cats.filter(([, cd]) => cd.expense > 0);
      if (entries.length === 0) return [{ name: 'No data', value: 1 }];
      return entries.map(([cat, cd]) => ({ name: cat, value: cd.expense }));
    }
  }, [mainTab, groupEntries, allCategories, catGroupFilter, groupGroupFilter]);

  const isNoData = donutData.length === 1 && donutData[0].name === 'No data';
  const donutColors = isNoData ? ['#333'] : COLORS;
  const isNow = month === now.getMonth() && year === now.getFullYear();

  const Breadcrumb = () => {
    if (level === 'summary') return null;
    return (
      <div className="flex items-center gap-1 mb-3 text-sub text-text-muted">
        <button onClick={() => { setLevel('summary'); setSelectedGroup(null); setSelectedCategory(null); }}
          className="text-[#a78bfa] font-bold hover:underline">{t('dashboard_summary')}</button>
        {selectedGroup && <>
          <ChevronRight size={12} />
          <button onClick={() => { setLevel('group'); setSelectedCategory(null); }}
            className={level === 'category' ? 'text-[#a78bfa] font-bold hover:underline' : 'font-bold text-[var(--text-primary)]'}>
            {selectedGroup}
          </button>
        </>}
        {selectedCategory && <>
          <ChevronRight size={12} />
          <span className="font-bold text-[var(--text-primary)]">{selectedCategory}</span>
        </>}
      </div>
    );
  };

  const Overview = () => (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
      <p className="text-caption font-bold text-text-muted uppercase tracking-wider mb-3">{t('dashboard_overview')}</p>
      <div className="flex items-center gap-4">
        <div className="w-[110px] h-[110px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" strokeWidth={0}>
                {donutData.map((_, i) => <Cell key={i} fill={donutColors[i % donutColors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => (v as number).toLocaleString()}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 min-w-0">
          {isNoData ? (
            <p className="text-text-muted text-sub italic">{t('no_data')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
              {donutData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-caption text-text-muted font-medium truncate">{d.name}</span>
                  </div>
                  <span className="text-caption font-bold shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-[var(--border-color)] flex gap-3">
            <div>
              <p className="text-tiny text-text-muted font-semibold uppercase tracking-wide mb-0.5">{t('dashboard_income')}</p>
              <p className="text-sub font-black text-[#34d399]">{fmt(totalIncome)}</p>
            </div>
            <div>
              <p className="text-tiny text-text-muted font-semibold uppercase tracking-wide mb-0.5">{t('dashboard_expense')}</p>
              <p className="text-sub font-black text-[#f87171]">{fmt(totalExpense)}</p>
            </div>
            <div>
              <p className="text-tiny text-text-muted font-semibold uppercase tracking-wide mb-0.5">{t('dashboard_balance')}</p>
              <p className={`text-sub font-black ${balance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>{balance >= 0 ? '+' : ''}{fmt(balance)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 w-full max-w-full mx-auto px-3 sm:px-6 pb-28 pt-6 flex flex-col gap-3 overflow-x-hidden">

      {/* Header — Removed redundant title, App.tsx handles it */}

      {/* Year / Month dropdowns — Month hidden on Monthly Trend tab */}
      <div className="flex items-center justify-between">
        <Dropdown value={year} options={YEARS} labelFn={v => String(v)} onChange={v => setYear(v)} align="left" />
        {mainTab === 'group' && (
          <div className="flex items-center gap-1.5">
            {isNow && <span className="text-tiny font-bold text-[#a78bfa] bg-[#7c6aff]/10 px-2 py-0.5 rounded-full">{t('dashboard_current')}</span>}
            <Dropdown
              value={month}
              options={[null, ...Array.from({ length: 12 }, (_, i) => i)] as (number | null)[]}
              labelFn={v => v === null ? t('filter_all') : MONTHS[v]}
              onChange={v => setMonth(v)}
              align="right"
            />
          </div>
        )}
      </div>

      {/* Main Tab: Group | Category */}
      <div className="flex gap-2">
        {(['group', 'trend'] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`flex-1 py-2 px-1 rounded-xl text-sub font-bold transition-all border min-h-[40px] whitespace-normal leading-tight text-center ${mainTab === tab
              ? 'bg-[#7c6aff] text-white border-[#7c6aff] shadow-md shadow-[#7c6aff]/25'
              : 'bg-[var(--bg-card)] text-text-muted border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[#7c6aff]/40'
              }`}>
            {tab === 'group' ? t('dashboard_expense_by_group') : t('dashboard_monthly_trend')}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#7c6aff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={mainTab + level + (selectedGroup ?? '') + (selectedCategory ?? '') + month + year}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}>

            {/* ── TAB: EXPENSE BY GROUP ── */}
            {mainTab === 'group' && (
              <>
                <Breadcrumb />

                {level === 'summary' && (
                  <div className="space-y-3">
                    <Overview />
                    {groupEntries.length > 0 && (
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                        <div className="flex flex-wrap items-center justify-between mb-3 gap-y-2 gap-x-2">
                          <p className="text-tiny font-bold text-text-muted uppercase tracking-wider min-w-0 flex-1" style={{ wordBreak: 'break-word' }}>
                            {t('dashboard_by_group')}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setIsSorting(!isSorting)}
                              className={`text-tiny font-bold px-2 py-1 rounded-lg border transition-all whitespace-nowrap ${isSorting ? 'bg-[#7c6aff] text-white border-[#7c6aff]' : 'bg-[var(--bg-card)] text-text-muted border-[var(--border-color)]'}`}>
                              {isSorting ? 'Done' : 'Rearrange'}
                            </button>
                            <Dropdown
                              value={groupGroupFilter}
                              options={['__all__', ...groupEntries.map(([g]) => g)]}
                              labelFn={v => v === '__all__' ? t('filter_all') : v}
                              onChange={v => setGroupGroupFilter(v)}
                              align="right"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(groupGroupFilter === '__all__' ? groupEntries : groupEntries.filter(([g]) => g === groupGroupFilter)).map(([g, gd]: [string, GroupData], i) => {
                            const isIncomeGroup = g.toLowerCase() === 'income';
                            const displayVal = isIncomeGroup ? gd.income : gd.expense;
                            const totalValForPct = isIncomeGroup ? totalIncome : totalExpense;
                            const pct = totalValForPct > 0 ? Math.round((displayVal / totalValForPct) * 100) : 0;

                            const budget = budgets.find(b => b.group_name === g);
                            const budgetPct = budget && budget.amount > 0 ? Math.min(Math.round((gd.expense / budget.amount) * 100), 100) : (budget && budget.amount === 0 && gd.expense > 0 ? 100 : 0);
                            const over = budget ? gd.expense > budget.amount : false;
                            const remaining = budget ? budget.amount - gd.expense : null;
                            const budgetBarColor = over ? '#f87171' : (budgetPct && budgetPct > 75) ? '#fbbf24' : '#34d399';
                            return (
                              <div key={g} className="relative group">
                                <button onClick={() => { if (!isSorting) { setSelectedGroup(g); setLevel('group'); } }}
                                  className={`w-full text-left p-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border transition-all flex flex-col ${isSorting ? 'border-[#7c6aff]/40 cursor-default' : 'border-transparent hover:border-[var(--border-color)]'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {isSorting && (
                                        <div className="flex flex-col gap-0.5 mr-1">
                                          <button onClick={(e) => { e.stopPropagation(); moveGroup(i, 'up'); }} className="p-0.5 hover:text-[#7c6aff]"><ArrowUp size={12} /></button>
                                          <button onClick={(e) => { e.stopPropagation(); moveGroup(i, 'down'); }} className="p-0.5 hover:text-[#7c6aff]"><ArrowDown size={12} /></button>
                                        </div>
                                      )}
                                      <span className="text-sub font-bold text-[var(--text-primary)]">{g}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-sub font-black ${isIncomeGroup ? 'text-[#34d399]' : ''}`}
                                        style={!isIncomeGroup ? { color: COLORS[i % COLORS.length] } : undefined}>
                                        {fullFmt(displayVal)}
                                      </span>
                                      <span className="text-tiny text-text-muted bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">{pct}%</span>
                                      {!isSorting && <ChevronRight size={13} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />}
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                      className="h-full rounded-full" style={{ backgroundColor: isIncomeGroup ? '#34d399' : COLORS[i % COLORS.length] }} />
                                  </div>
                                  {budget && (
                                    <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                                      <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-1.5">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                                          className="h-full rounded-full" style={{ backgroundColor: budgetBarColor }} />
                                      </div>
                                      <div className="flex flex-wrap items-center justify-between gap-y-0.5">
                                        {over
                                          ? <span className="text-tiny font-bold text-[#f87171]">⚠ {t('dashboard_over_by')} {fullFmt(gd.expense - budget.amount)}</span>
                                          : <span className="text-tiny text-text-muted">{budgetPct}% {t('dashboard_of_budget')}</span>}
                                        <span className="text-tiny text-text-muted break-all">
                                          {fullFmt(gd.expense)} / {fullFmt(budget.amount)}
                                          {!over && remaining !== null && <span className="font-bold ml-1" style={{ color: budgetBarColor }}>({fullFmt(remaining)} {t('dashboard_left')})</span>}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {!budget && !isIncomeGroup && <p className="text-tiny text-text-muted mt-1.5">{t('dashboard_no_budget_set')}</p>}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {level === 'group' && selectedGroup && (() => {
                  const gd = data?.byGroup[selectedGroup];
                  if (!gd) return null;
                  // Flatten all entries across all categories in this group
                  const allEntries = (Object.entries(gd.categories) as [string, CategoryData][]).flatMap(([cat, cd]: [string, CategoryData]) =>
                    cd.entries.map((e: any) => ({ ...e, category: cat }))
                  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div className="space-y-3">
                      {/* Group summary bar */}
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col min-w-0">
                            <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-1 truncate">{selectedGroup}</p>
                            <span className="text-tiny px-2 py-0.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted w-fit">
                              {t('dashboard_summary')}
                            </span>
                          </div>
                          <div className="flex gap-5 text-right shrink-0">
                            <div>
                              <p className="text-tiny text-text-muted uppercase leading-none mb-1.5">{t('dashboard_expense')}</p>
                              <p className="text-body font-black text-[#f87171] leading-none">{fullFmt(gd.expense)}</p>
                            </div>
                            {gd.income > 0 && <div>
                              <p className="text-tiny text-text-muted uppercase leading-none mb-1.5">{t('dashboard_income')}</p>
                              <p className="text-body font-black text-[#34d399] leading-none">{fullFmt(gd.income)}</p>
                            </div>}
                            <div>
                              <p className="text-tiny text-text-muted uppercase leading-none mb-1.5">{t('dashboard_entries')}</p>
                              <p className="text-body font-black text-[var(--text-primary)] leading-none">{allEntries.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Flat entries list — Date, Item, Amount, Category */}
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-input)] grid grid-cols-[1fr_auto] gap-2">
                          <span className="text-tiny font-bold text-text-muted uppercase tracking-wider">{t('col_item_date')}</span>
                          <span className="text-tiny font-bold text-text-muted uppercase tracking-wider text-right">{t('col_amount')}</span>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {allEntries.length === 0
                            ? <p className="text-center text-text-muted text-sub py-8 italic">{t('no_entries_found')}</p>
                            : allEntries.map((e: any) => (
                              <div key={e.id} className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 items-center">
                                <div className="min-w-0 pr-2">
                                  <p className="text-body font-bold text-[var(--text-primary)] leading-snug whitespace-normal break-words">{e.item}</p>
                                  <p className="text-tiny text-[#a78bfa] font-medium mt-1">{e.date}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                  <div className="leading-tight">
                                    {e.expense > 0 && <p className="text-body font-bold text-[#f87171]">-{fullFmt(e.expense)}</p>}
                                    {e.income > 0 && <p className="text-body font-bold text-[#34d399]">+{fullFmt(e.income)}</p>}
                                  </div>
                                  <span className="text-tiny px-1.5 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted whitespace-nowrap">
                                    {CATEGORY_ICONS[e.category] ?? '📦'} {e.category}
                                  </span>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {level === 'category' && selectedGroup && selectedCategory && (() => {
                  const entries = data?.byGroup[selectedGroup]?.categories[selectedCategory]?.entries ?? [];
                  const cd = data?.byGroup[selectedGroup]?.categories[selectedCategory];
                  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return (
                    <div className="space-y-3">
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                        <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-2">
                          {CATEGORY_ICONS[selectedCategory] ?? '📦'} {selectedCategory}
                        </p>
                        <div className="flex gap-4">
                          {cd && cd.expense > 0 && <div><p className="text-tiny text-text-muted mb-0.5">{t('dashboard_expense')}</p><p className="text-lg font-bold text-[#f87171]">{fullFmt(cd.expense)}</p></div>}
                          {cd && cd.income > 0 && <div><p className="text-tiny text-text-muted mb-0.5">{t('dashboard_income')}</p><p className="text-lg font-bold text-[#34d399]">{fullFmt(cd.income)}</p></div>}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                          <p className="text-tiny font-bold text-text-muted uppercase tracking-wider">{t('dashboard_entries_count', { count: sorted.length })}</p>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {sorted.length === 0
                            ? <p className="text-center text-text-muted text-sub py-8 italic">{t('no_entries_found')}</p>
                            : sorted.map((e: any) => (
                              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-body font-semibold text-[var(--text-primary)]">{e.item}</p>
                                  <p className="text-tiny text-text-muted mt-0.5">{e.date}</p>
                                </div>
                                <div className="text-right">
                                  {e.expense > 0 && <p className="text-body font-bold text-[#f87171]">-{fullFmt(e.expense)}</p>}
                                  {e.income > 0 && <p className="text-body font-bold text-[#34d399]">+{fullFmt(e.income)}</p>}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ── TAB: MONTHLY TREND ── */}
            {mainTab === 'trend' && (() => {
              if (trendLoading) return (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-2 border-[#7c6aff] border-t-transparent rounded-full animate-spin" />
                </div>
              );
              if (!trendData) return null;

              const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const chartData = MONTH_LABELS.map((label, i) => {
                const key = `${year}-${String(i + 1).padStart(2, '0')}`;
                const m = trendData.monthly?.[key] ?? { income: 0, expense: 0 };
                return { label, key, income: m.income, expense: m.expense, balance: m.income - m.expense };
              });

              const yearIncome = trendData.totalIncome ?? 0;
              const yearExpense = trendData.totalExpense ?? 0;
              const yearBalance = yearIncome - yearExpense;
              const savingRate = yearIncome > 0 ? Math.round(((yearIncome - yearExpense) / yearIncome) * 100) : 0;

              const topCats: [string, number][] = Object.entries(trendData.byCategory ?? {})
                .sort((a: any, b: any) => b[1] - a[1]).slice(0, 8) as [string, number][];

              const topCatTotal = topCats.reduce((s, [, v]) => s + v, 0);

              return (
                <div className="space-y-3">
                  {/* Year summary cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_year_income')}</p>
                      <p className="text-lg font-bold text-[#34d399]">{fullFmt(yearIncome)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_year_expense')}</p>
                      <p className="text-lg font-bold text-[#f87171]">{fullFmt(yearExpense)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_balance')}</p>
                      <p className={`text-lg font-bold ${yearBalance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>{yearBalance >= 0 ? '+' : ''}{fullFmt(yearBalance)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_saving_rate')}</p>
                      <p className={`text-lg font-bold ${savingRate >= 20 ? 'text-[#34d399]' : savingRate >= 0 ? 'text-[#fbbf24]' : 'text-[#f87171]'}`}>{savingRate}%</p>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-tiny font-bold text-text-muted uppercase tracking-wider">{t('dashboard_monthly_overview')} — {year}</p>
                      <div className="flex items-center gap-3 text-tiny text-text-muted">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#34d399] inline-block" />{t('dashboard_income')}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f87171] inline-block" />{t('dashboard_expense')}</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={36} />
                        <Tooltip
                          formatter={(v: any, name: any) => [(v as number).toLocaleString(), name]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 10 }}
                        />
                        <Bar dataKey="income" fill="#34d399" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                  </div>

                  {/* Top categories */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-tiny font-bold text-text-muted uppercase tracking-wider mb-3">
                      {t('dashboard_top_categories')} — {year}
                    </p>
                    {topCats.length === 0
                      ? <p className="text-center text-text-muted text-sub py-4 italic">{t('no_data')}</p>
                      : <div className="space-y-2">
                        {topCats.map(([cat, val], i) => {
                          const pct = topCatTotal > 0 ? Math.round((val / topCatTotal) * 100) : 0;
                          return (
                            <div key={cat} className="flex items-center gap-3">
                              <span className="text-title shrink-0">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sub font-semibold text-[var(--text-primary)] truncate">{cat}</span>
                                  <span className="text-sub font-black ml-2 shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{fullFmt(val)}</span>
                                </div>
                                <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                    className="h-full rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                              </div>
                              <span className="text-tiny text-text-muted shrink-0">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    }
                  </div>
                </div>
              );
            })()}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};