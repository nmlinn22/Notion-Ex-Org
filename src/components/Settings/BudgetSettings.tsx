import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Edit2, ChevronDown } from 'lucide-react';
import { Budget } from '../../hooks/useBudget';
import { Session } from '@supabase/supabase-js';
import { useLanguage } from '../../lib/LanguageContext';

interface BudgetSettingsProps {
  groups: string[];
  budgets: Budget[];
  onSave: (group_name: string, amount: number) => void;
  onDelete: (group_name: string) => void;
  currentExpenses?: Record<string, number>;
  session?: Session | null;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

export const BudgetSettings: React.FC<BudgetSettingsProps> = ({
  groups, budgets, onSave, onDelete, currentExpenses = {} as Record<string, number>, session
}) => {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [tableYear, setTableYear] = useState(new Date().getFullYear());
  const [yearOpen, setYearOpen] = useState(false);
  const [budgetTab, setBudgetTab] = useState<'limits' | 'table'>('limits');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingTable, setLoadingTable] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!session) return;
    setLoadingTable(true);
    try {
      const res = await fetch(`${window.location.origin}/api/entries/summary?year=${tableYear}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) setSummaryData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingTable(false); }
  }, [session, tableYear]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const getBudget = (g: string) => budgets.find(b => b.group_name === g);

  const startEdit = (g: string) => {
    const b = getBudget(g);
    setAmount(b ? String(b.amount) : '');
    setEditing(g);
  };

  const handleSave = () => {
    if (!editing) return;
    if (amount === '' || amount === undefined) {
      // Empty = remove budget limit
      onDelete(editing);
      setEditing(null);
      setAmount('');
      return;
    }
    const num = Number(amount.replace(/,/g, ''));
    if (isNaN(num) || num < 0) return;
    onSave(editing, num);
    setEditing(null);
    setAmount('');
  };

  // Build table rows: month x group
  const tableRows = MONTHS.map((label, i) => {
    const key = `${tableYear}-${String(i + 1).padStart(2, '0')}`;
    const m = summaryData?.monthly?.[key] ?? { income: 0, expense: 0 };
    // per-group spending for this month — derive from drilldown if available
    return { label, key, income: m.income, expense: m.expense, balance: m.income - m.expense };
  });

  const yearIncome = summaryData?.totalIncome ?? 0;
  const yearExpense = summaryData?.totalExpense ?? 0;
  const yearBalance = yearIncome - yearExpense;

  return (
    <div className="space-y-4">

      {/* ── Tab Toggle — matches Dashboard style ── */}
      <div className="flex gap-2">
        {(['limits', 'table'] as const).map(tab => (
          <button key={tab} onClick={() => setBudgetTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${budgetTab === tab
              ? 'bg-[#7c6aff] text-white border-[#7c6aff] shadow-md shadow-[#7c6aff]/25'
              : 'bg-[var(--bg-card)] text-text-muted border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[#7c6aff]/40'
              }`}>
            {tab === 'limits' ? t('budget_tab_limits') : t('budget_tab_allocation')}
          </button>
        ))}
      </div>

      {/* ── Section 1: Group Budget Limits ── */}
      {budgetTab === 'limits' && (
        <div className="space-y-3">

          {/* Section label */}
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-1">
            {t('budget_group_limits')}
          </p>

          {groups.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-8 text-center">
              <p className="text-[11px] text-text-muted">{t('budget_no_limit')}</p>
            </div>
          ) : (
            groups.map((g) => {
              const budget = getBudget(g);
              const isEditing = editing === g;
              const spent = currentExpenses[g] ?? 0;
              const remaining = budget ? budget.amount - spent : 0;
              const isOver = budget ? spent > budget.amount : false;
              const pct = budget && budget.amount > 0
                ? Math.min(Math.round((spent / budget.amount) * 100), 100)
                : 0;
              const barColor = isOver ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399';

              return (
                <div key={g} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="px-4 py-4 flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] shrink-0 min-w-[80px]">{g}</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder={t('budget_limit_placeholder')}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        className="flex-1 bg-[var(--bg-input)] border border-[#7c6aff]/40 rounded-xl px-3 py-1.5 text-xs font-mono outline-none focus:border-[#7c6aff] text-[var(--text-primary)]"
                      />
                      <button onClick={handleSave} className="p-1.5 rounded-lg bg-[#7c6aff] text-white">
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => { setEditing(null); setAmount(''); }}
                        className="p-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted"
                      >
                        <X size={13} />
                      </button>
                    </div>

                  ) : (
                    <>
                      {/* Card header: group name + % badge + edit btn */}
                      <div className="flex items-center justify-between px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{g}</span>
                          {budget && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOver
                                ? 'bg-[#f87171]/10 text-[#f87171]'
                                : pct >= 75
                                  ? 'bg-[#fbbf24]/10 text-[#fbbf24]'
                                  : 'bg-[#34d399]/10 text-[#34d399]'
                              }`}>
                              {isOver ? '⚠ Over' : `${pct}%`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(g)}
                          className="p-1.5 rounded-lg bg-[#7c6aff]/10 text-[#a78bfa] hover:bg-[#7c6aff]/20 transition-all"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>

                      {budget ? (
                        <div className="px-4 pb-4 space-y-2.5">

                          {/* Progress bar */}
                          <div className="h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                          </div>

                          {/* Divider */}
                          <div className="border-t border-[var(--border-color)]" />

                          {/* Budget row */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-text-muted">Budget</span>
                            <span className="text-[13px] font-mono font-semibold text-[#a78bfa]">
                              {fmt(budget.amount)}
                            </span>
                          </div>

                          {/* Expense row */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-text-muted">Expense</span>
                            <span className={`text-[13px] font-mono font-semibold ${isOver ? 'text-[#f87171]' : 'text-[var(--text-primary)]'}`}>
                              {fmt(spent)}
                            </span>
                          </div>

                          {/* Balance row */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-text-muted">Balance</span>
                            <span className={`text-[13px] font-mono font-bold ${isOver ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
                              {isOver ? `−${fmt(Math.abs(remaining))}` : fmt(remaining)}
                            </span>
                          </div>

                        </div>
                      ) : (
                        /* No budget set */
                        <div className="px-4 pb-4">
                          <div className="px-3 py-2.5 bg-[var(--bg-input)]/40 border border-[var(--border-color)] rounded-xl text-center">
                            <p className="text-[11px] text-text-muted italic">{t('budget_no_limit')}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Help hint */}
          <p className="text-[11px] text-text-muted text-center leading-relaxed px-2 pb-1">
            📝 {t('budget_limit_help')}
          </p>

        </div>
      )}

      {/* ── Section 2: Year × Month Table ── */}
      {budgetTab === 'table' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('budget_tab_allocation')}</p>
            {/* Year dropdown */}
            <div className="relative">
              <button onClick={() => setYearOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs font-semibold hover:border-[#7c6aff]/50 transition-all">
                {tableYear}
                <ChevronDown size={13} className={`text-text-muted transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
              </button>
              {yearOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setYearOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden min-w-[80px]">
                    {YEARS.map(y => (
                      <button key={y} onClick={() => { setTableYear(y); setYearOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-xs font-semibold transition-colors ${y === tableYear ? 'bg-[#7c6aff]/15 text-[#a78bfa]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {loadingTable ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#7c6aff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-input)]">
                      <th className="text-left px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider sticky left-0 bg-[var(--bg-input)] min-w-[48px]">Month</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-bold text-[#34d399] uppercase tracking-wider min-w-[64px]">Income</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-bold text-[#f87171] uppercase tracking-wider min-w-[64px]">Spent</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider min-w-[72px]">Balance</th>
                      {groups.map(g => (
                        <th key={g} className="text-right px-3 py-2.5 text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[72px] whitespace-nowrap">
                          {g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => {
                      const hasData = row.income > 0 || row.expense > 0;
                      const isCurrentMonth = row.key === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                      // per-group expense for this month from summaryData
                      const monthGroupData = summaryData?.monthlyByGroup?.[row.key] ?? {};

                      return (
                        <tr key={row.key}
                          className={`border-b border-[var(--border-color)]/50 transition-colors ${isCurrentMonth ? 'bg-[#7c6aff]/5' : i % 2 === 0 ? '' : 'bg-[var(--bg-input)]/30'} ${hasData ? '' : 'opacity-40'}`}>
                          <td className={`px-3 py-2.5 font-bold sticky left-0 ${isCurrentMonth ? 'text-[#a78bfa] bg-[#7c6aff]/5' : 'text-[var(--text-primary)] bg-[var(--bg-card)]'}`}>
                            {row.label}
                            {isCurrentMonth && <span className="ml-1 text-[8px] bg-[#7c6aff]/20 text-[#a78bfa] px-1 rounded">now</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-[#34d399] font-semibold">{hasData ? fmt(row.income) : '—'}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-[#f87171] font-semibold">{hasData ? fmt(row.expense) : '—'}</td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${row.balance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>
                            {hasData ? (row.balance >= 0 ? '+' : '') + fmt(row.balance) : '—'}
                          </td>
                          {groups.map(g => {
                            const spent = monthGroupData[g] ?? 0;
                            const budget = budgets.find(b => b.group_name === g);
                            const over = budget && budget.amount > 0 && spent > budget.amount;
                            return (
                              <td key={g} className={`px-3 py-2.5 text-right font-mono font-semibold ${over ? 'text-[#f87171]' : hasData && spent > 0 ? 'text-[var(--text-primary)]' : 'text-text-muted'}`}>
                                {hasData && spent > 0 ? (over ? '⚠ ' : '') + fmt(spent) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Year total row */}
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-input)]">
                      <td className="px-3 py-2.5 text-[10px] font-black text-text-muted uppercase sticky left-0 bg-[var(--bg-input)]">Total</td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-[#34d399]">{fmt(yearIncome)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-[#f87171]">{fmt(yearExpense)}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-black ${yearBalance >= 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}`}>
                        {yearBalance >= 0 ? '+' : ''}{fmt(yearBalance)}
                      </td>
                      {groups.map(g => {
                        const total = Object.values(summaryData?.monthlyByGroup ?? {}).reduce((s: number, mg: any) => s + (mg[g] ?? 0), 0) as number;
                        return (
                          <td key={g} className="px-3 py-2.5 text-right font-mono font-black text-[var(--text-primary)]">
                            {total > 0 ? fmt(total) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};