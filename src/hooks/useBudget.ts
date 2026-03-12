import { ts } from '../lib/LanguageContext';
import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface Budget {
  id?: number;
  group_name: string;
  amount: number;
}

export function useBudget(session: Session | null) {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const fetchBudgets = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/budgets`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.data || []);
      }
    } catch (err) {
      console.error('Fetch budgets error:', err);
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchBudgets();
  }, [session, fetchBudgets]);

  const saveBudget = async (group_name: string, amount: number) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ group_name, amount })
      });
      if (!res.ok) throw new Error('Save failed');
      await fetchBudgets();
      toast.success(ts('toast_budget_saved', { group: group_name }));
    } catch (err: any) {
      toast.error(ts('toast_budget_save_failed'));
    }
  };

  const deleteBudget = async (group_name: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/budgets`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ group_name })
      });
      if (!res.ok) throw new Error('Delete failed');
      setBudgets(prev => prev.filter(b => b.group_name !== group_name));
      toast.success(ts('toast_budget_deleted', { group: group_name }));
    } catch (err: any) {
      toast.error(ts('toast_budget_delete_failed'));
    }
  };

  const getBudgetForGroup = (group_name: string) =>
    budgets.find(b => b.group_name === group_name);

  return { budgets, saveBudget, deleteBudget, getBudgetForGroup, fetchBudgets };
}