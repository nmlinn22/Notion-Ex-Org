import { Session } from '@supabase/supabase-js';

export interface Entry {
  date: string;
  item: string;
  income: number | null;
  expense: number | null;
  group: string;
  category: string;
  id?: number;
  created_at?: string;
}

export interface Status {
  type: 'success' | 'error' | 'loading';
  message: string;
}

export type SettingsView = 'menu' | 'admin' | 'api' | 'notion' | 'customize' | 'history' | 'contact' | 'budget' | 'autopayments' | 'backup' | 'premium';