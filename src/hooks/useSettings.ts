import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { ts } from '../lib/LanguageContext';
import { Status } from '../types';
import { DEFAULT_GROUPS, DEFAULT_CATEGORIES } from '../constants';
import { translateError } from '../lib/errorUtils';

export function useSettings(session: Session | null, setStatus: (status: Status | null) => void) {
  const [geminiKey, setGeminiKey] = useState('');
  const [notionKey, setNotionKey] = useState('');
  const [notionDbId, setNotionDbId] = useState('');
  const [groups, setGroups] = useState<string[]>(DEFAULT_GROUPS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showGemini, setShowGemini] = useState(false);
  const [showNotion, setShowNotion] = useState(false);
  const [showNotionDb, setShowNotionDb] = useState(false);
  const [storageMode, setStorageMode] = useState<'app' | 'notion'>('app');

  const fetchSettings = async (currentSession: Session) => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .single();

      if (error && error.code !== 'PGRST116' && (error as any).status !== 406) throw error;

      if (data) {
        setGeminiKey(data.gemini_key || '');
        setNotionKey(data.notion_key || '');
        setNotionDbId(data.notion_db_id || '');
        if (data.groups) setGroups(data.groups);
        if (data.categories) setCategories(data.categories);
        if (data.storage_mode) setStorageMode(data.storage_mode);
        setShowGemini(!!data.gemini_key);
        setShowNotion(!!data.notion_key);
        setShowNotionDb(!!data.notion_db_id);
      }
    } catch (err: any) {
      console.error("Fetch settings error:", err);
      const translatedMsg = translateError(err.message);
      toast.error(ts('toast_settings_load_failed'));
      setStatus({ type: 'error', message: translatedMsg });
    }
  };

  useEffect(() => {
    if (session) {
      fetchSettings(session);
    }
  }, [session]);

  const saveSettings = async () => {
    if (!session) return;
    
    setStatus({ type: 'loading', message: 'Saving settings to cloud...' });
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: session.user.id,
          gemini_key: geminiKey,
          notion_key: notionKey,
          notion_db_id: notionDbId,
          groups: groups,
          categories: categories,
          storage_mode: storageMode,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(ts('toast_settings_saved'));
      setStatus({ type: 'success', message: 'Settings saved to cloud.' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err: any) {
      const translatedMsg = translateError(err.message);
      toast.error(translatedMsg);
      setStatus({ type: 'error', message: translatedMsg });
    }
  };

  const addGroup = (name: string) => {
    if (!groups.includes(name)) {
      setGroups(prev => [...prev, name]);
    }
  };

  const addCategory = (name: string) => {
    if (!categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  return {
    geminiKey, setGeminiKey,
    notionKey, setNotionKey,
    notionDbId, setNotionDbId,
    groups, setGroups,
    categories, setCategories,
    showGemini, setShowGemini,
    showNotion, setShowNotion,
    showNotionDb, setShowNotionDb,
    saveSettings,
    addGroup,
    addCategory,
    storageMode, setStorageMode
  };
}