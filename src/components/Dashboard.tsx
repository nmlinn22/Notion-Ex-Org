import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChevronRight, ChevronDown, Wallet, Settings } from 'lucide-react';
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

const COLORS = ['#7c6aff','#34d399','#f472b6','#fb923c','#60a5fa','#a78bfa','#4ade80','#fbbf24','#f87171','#38bdf8'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-primary)] hover:border-[#7c6aff]/50 transition-all"
      >
        {labelFn(value)}
        <ChevronDown size={13} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
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
              className={`absolute top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden min-w-[140px] ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              {options.map(opt => (
                <button
                  key={String(opt)}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full px-4 py-2 text-left text-sm font-semibold transition-colors whitespace-nowrap ${
                    opt === value ? 'bg-[#7c6aff]/15 text-[#a78bfa]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
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
      <p className="text-text-muted text-sm">{t('dashboard_app_only')}</p>
    </div>
  );

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const balance = totalIncome - totalExpense;
  const groupEntries = (Object.entries(data?.byGroup ?? {}) as [string, GroupData][]).sort((a, b) => b[1].expense - a[1].expense);

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
      <div className="flex items-center gap-1 mb-3 text-xs text-text-muted">
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
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">{t('dashboard_overview')}</p>
      <div className="flex items-center gap-4">
        <div className="w-[120px] h-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={34} outerRadius={52} dataKey="value" strokeWidth={0}>
                {donutData.map((_, i) => <Cell key={i} fill={donutColors[i % donutColors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => (v as number).toLocaleString()}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          {isNoData ? (
            <p className="text-text-muted text-xs italic">{t('no_data')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
              {donutData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-text-muted font-medium truncate">{d.name}</span>
                  </div>
                  <span className="text-[10px] font-black shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-[var(--border-color)] flex gap-4">
            <div>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wide">{t('dashboard_income')}</p>
              <p className="text-sm font-black text-[#34d399]">{fmt(totalIncome)}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wide">{t('dashboard_expense')}</p>
              <p className="text-sm font-black text-[#f87171]">{fmt(totalExpense)}</p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted font-bold uppercase tracking-wide">{t('dashboard_balance')}</p>
              <p className={`text-sm font-black ${balance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>{balance >= 0 ? '+' : ''}{fmt(balance)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 max-w-[95%] mx-auto px-2 sm:px-6 pb-28 pt-6 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[var(--text-primary)]">{t('dashboard_title')}</h2>
        {onOpenSettings && (
          <button onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all">
            <Settings size={18} />
          </button>
        )}
      </div>

      {/* Year / Month dropdowns — Month hidden on Monthly Trend tab */}
      <div className="flex items-center justify-between">
        <Dropdown value={year} options={YEARS} labelFn={v => String(v)} onChange={v => setYear(v)} align="left" />
        {mainTab === 'group' && (
          <div className="flex items-center gap-1.5">
            {isNow && <span className="text-[9px] font-bold text-[#a78bfa] bg-[#7c6aff]/10 px-2 py-0.5 rounded-full">{t('dashboard_current')}</span>}
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
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              mainTab === tab
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
                        <div className="flex items-center justify-between mb-3 gap-2">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0">
                            {t('dashboard_by_group')} <span className="text-[9px] normal-case font-normal">— {t('dashboard_tap_to_view')}</span>
                          </p>
                          <Dropdown
                            value={groupGroupFilter}
                            options={['__all__', ...groupEntries.map(([g]) => g)]}
                            labelFn={v => v === '__all__' ? t('filter_all') : v}
                            onChange={v => setGroupGroupFilter(v)}
                            align="right"
                          />
                        </div>
                        <div className="space-y-2">
                          {(groupGroupFilter === '__all__' ? groupEntries : groupEntries.filter(([g]) => g === groupGroupFilter)).map(([g, gd]: [string, GroupData], i) => {
                            const pct = totalExpense > 0 ? Math.round((gd.expense / totalExpense) * 100) : 0;
                            const budget = budgets.find(b => b.group_name === g);
                            const budgetPct = budget ? Math.min(Math.round((gd.expense / budget.amount) * 100), 100) : null;
                            const over = budget ? gd.expense > budget.amount : false;
                            const remaining = budget ? budget.amount - gd.expense : null;
                            const budgetBarColor = over ? '#f87171' : budgetPct && budgetPct > 75 ? '#fbbf24' : '#34d399';
                            return (
                              <button key={g} onClick={() => { setSelectedGroup(g); setLevel('group'); }}
                                className="w-full text-left p-3 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-color)] transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-[var(--text-primary)]">{g}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black" style={{ color: COLORS[i % COLORS.length] }}>{fmt(gd.expense)}</span>
                                    <span className="text-[10px] text-text-muted bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">{pct}%</span>
                                    <ChevronRight size={13} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </div>
                                <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                    className="h-full rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                                {budget && (
                                  <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                                    <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden mb-1.5">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${budgetPct}%` }} transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                                        className="h-full rounded-full" style={{ backgroundColor: budgetBarColor }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      {over
                                        ? <span className="text-[9px] font-black text-[#f87171]">⚠ {t('dashboard_over_by')} {fmt(gd.expense - budget.amount)}</span>
                                        : <span className="text-[9px] text-text-muted">{budgetPct}% {t('dashboard_of_budget')}</span>}
                                      <span className="text-[9px] text-text-muted">
                                        {fmt(gd.expense)} / {fmt(budget.amount)}
                                        {!over && remaining !== null && <span className="font-bold ml-1" style={{ color: budgetBarColor }}> ({fmt(remaining)} {t('dashboard_left')})</span>}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {!budget && <p className="text-[9px] text-text-muted mt-1.5">{t('dashboard_no_budget_set')}</p>}
                              </button>
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
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">{selectedGroup}</p>
                        <div className="flex gap-4">
                          <div><p className="text-[10px] text-text-muted mb-0.5">{t('dashboard_expense')}</p><p className="text-xl font-black text-[#f87171]">{fmt(gd.expense)}</p></div>
                          {gd.income > 0 && <div><p className="text-[10px] text-text-muted mb-0.5">{t('dashboard_income')}</p><p className="text-xl font-black text-[#34d399]">{fmt(gd.income)}</p></div>}
                          <div><p className="text-[10px] text-text-muted mb-0.5">{t('dashboard_entries')}</p><p className="text-xl font-black text-[var(--text-primary)]">{allEntries.length}</p></div>
                        </div>
                      </div>
                      {/* Flat entries list — Date, Item, Amount, Category */}
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-input)] grid grid-cols-[1fr_auto_auto] gap-2">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{t('col_item_date')}</span>
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider text-right">{t('col_amount')}</span>
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider text-right">{t('filter_category')}</span>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {allEntries.length === 0
                            ? <p className="text-center text-text-muted text-xs py-8 italic">{t('no_entries_found')}</p>
                            : allEntries.map((e: any) => (
                              <div key={e.id} className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-3 items-center">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{e.item}</p>
                                  <p className="text-[10px] text-text-muted">{e.date}</p>
                                </div>
                                <div className="text-right">
                                  {e.expense > 0 && <p className="text-sm font-bold text-[#f87171]">-{fmt(e.expense)}</p>}
                                  {e.income > 0 && <p className="text-sm font-bold text-[#34d399]">+{fmt(e.income)}</p>}
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted whitespace-nowrap">
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
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                          {CATEGORY_ICONS[selectedCategory] ?? '📦'} {selectedCategory}
                        </p>
                        <div className="flex gap-4">
                          {cd && cd.expense > 0 && <div><p className="text-[10px] text-text-muted mb-0.5">{t('dashboard_expense')}</p><p className="text-xl font-black text-[#f87171]">{fmt(cd.expense)}</p></div>}
                          {cd && cd.income > 0 && <div><p className="text-[10px] text-text-muted mb-0.5">{t('dashboard_income')}</p><p className="text-xl font-black text-[#34d399]">{fmt(cd.income)}</p></div>}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('dashboard_entries_count', { count: sorted.length })}</p>
                        </div>
                        <div className="divide-y divide-[var(--border-color)]">
                          {sorted.length === 0
                            ? <p className="text-center text-text-muted text-xs py-8 italic">{t('no_entries_found')}</p>
                            : sorted.map((e: any) => (
                              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">{e.item}</p>
                                  <p className="text-[10px] text-text-muted mt-0.5">{e.date}</p>
                                </div>
                                <div className="text-right">
                                  {e.expense > 0 && <p className="text-sm font-bold text-[#f87171]">-{fmt(e.expense)}</p>}
                                  {e.income > 0 && <p className="text-sm font-bold text-[#34d399]">+{fmt(e.income)}</p>}
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

              const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_year_income')}</p>
                      <p className="text-lg font-black text-[#34d399]">{fmt(yearIncome)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_year_expense')}</p>
                      <p className="text-lg font-black text-[#f87171]">{fmt(yearExpense)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_balance')}</p>
                      <p className={`text-lg font-black ${yearBalance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>{yearBalance >= 0 ? '+' : ''}{fmt(yearBalance)}</p>
                    </div>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('dashboard_saving_rate')}</p>
                      <p className={`text-lg font-black ${savingRate >= 20 ? 'text-[#34d399]' : savingRate >= 0 ? 'text-[#fbbf24]' : 'text-[#f87171]'}`}>{savingRate}%</p>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('dashboard_monthly_overview')} — {year}</p>
                      <div className="flex items-center gap-3 text-[9px] text-text-muted">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#34d399] inline-block"/>{t('dashboard_income')}</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f87171] inline-block"/>{t('dashboard_expense')}</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={chartData} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={36} />
                        <Tooltip
                          formatter={(v: any, name: any) => [(v as number).toLocaleString(), name]}
                          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 11 }}
                        />
                        <Bar dataKey="income" fill="#34d399" radius={[3,3,0,0]} />
                        <Bar dataKey="expense" fill="#f87171" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>

                  </div>

                  {/* Top categories */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
                      {t('dashboard_top_categories')} — {year}
                    </p>
                    {topCats.length === 0
                      ? <p className="text-center text-text-muted text-xs py-4 italic">{t('no_data')}</p>
                      : <div className="space-y-2">
                          {topCats.map(([cat, val], i) => {
                            const pct = topCatTotal > 0 ? Math.round((val / topCatTotal) * 100) : 0;
                            return (
                              <div key={cat} className="flex items-center gap-3">
                                <span className="text-base shrink-0">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{cat}</span>
                                    <span className="text-xs font-black ml-2 shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{fmt(val)}</span>
                                  </div>
                                  <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: i * 0.05 }}
                                      className="h-full rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                  </div>
                                </div>
                                <span className="text-[9px] text-text-muted shrink-0">{pct}%</span>
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