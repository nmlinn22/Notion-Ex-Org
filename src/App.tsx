import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  AlertCircle,
  X,
  Home,
  Plus,
  BarChart2,
  FolderOpen,
  Target,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Entry, Status, SettingsView } from './types';
import { AuthForm } from './components/AuthForm';
import { InputCard } from './components/InputCard';
import { ParsedEntries } from './components/ParsedEntries';
import { SettingsDrawer } from './components/Settings/SettingsDrawer';

import { Dashboard } from './components/Dashboard';
import { EntrySheet } from './components/EntrySheet';
import { DataTable } from './components/DataTable';
import { Profile } from './components/Profile';
import { BudgetSettings } from './components/Settings/BudgetSettings';
import { useBudget } from './hooks/useBudget';
import { NotificationBell } from './components/NotificationBell';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { useSettings } from './hooks/useSettings';
import { useHistory } from './hooks/useHistory';
import { useAuth } from './hooks/useAuth';
import { useAdmin } from './hooks/useAdmin';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useOfflineSync } from './hooks/useOfflineSync';
import { translateError, parseHttpError } from './lib/errorUtils';
import { useLanguage } from './lib/LanguageContext';

type ActiveTab = 'home' | 'dashboard' | 'budget' | 'data' | 'profile';

const TAB_COUNT = 5;
const NAVBAR_H = 64;
const BUMP_H = 14;
const BUMP_W = 56;

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  activeBg: string;
}

const BumpNavbar: React.FC<{
  tabs: NavTab[];
  activeTab: string;
  setActiveTab: (id: any) => void;
}> = ({ tabs, activeTab, setActiveTab }) => {
  const activeIdx = tabs.findIndex(t => t.id === activeTab);
  const VW = 500;
  const VH = BUMP_H + 4;
  const tabW = VW / TAB_COUNT;
  const cx = tabW * activeIdx + tabW / 2;
  const bw = (BUMP_W / 500) * VW;
  const x0 = cx - bw / 2;
  const x1 = cx + bw / 2;
  const peak = VH - BUMP_H;
  const d = [
    `M 0 ${VH}`,
    `L ${x0 - 10} ${VH}`,
    `C ${x0 - 2} ${VH} ${x0} ${peak + 2} ${cx} ${peak}`,
    `C ${x1} ${peak + 2} ${x1 + 2} ${VH} ${x1 + 10} ${VH}`,
    `L ${VW} ${VH}`,
  ].join(' ');
  const activeColor = tabs[activeIdx]?.color ?? '#7c6aff';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="relative w-full overflow-visible pointer-events-none" style={{ height: BUMP_H + 2 }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: VH }}>
          <path d={d} fill="none" stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" style={{ transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
      </div>
      <div className="bg-[var(--bg-card)]/95 backdrop-blur-xl flex items-center px-1" style={{ height: NAVBAR_H }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-all">
              <motion.div
                animate={isActive ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${isActive ? tab.activeBg : ''}`}
                style={{ color: isActive ? tab.color : 'var(--text-muted)' }}
              >
                {tab.icon}
              </motion.div>
              <span className="text-[9px] font-bold transition-colors" style={{ color: isActive ? tab.color : 'var(--text-muted)' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const { t } = useLanguage();

  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ data: string; mediaType: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    () => (sessionStorage.getItem('activeTab') as ActiveTab) || 'home'
  );
  const [showAddSheet, setShowAddSheet] = useState(false);

  const { session, isAdmin, userRole, profileReady, handleLogout } = useAuth(setStatus);
  const { geminiKey, setGeminiKey, notionKey, setNotionKey, notionDbId, setNotionDbId, groups, setGroups, categories, setCategories, showGemini, setShowGemini, showNotion, setShowNotion, showNotionDb, setShowNotionDb, saveSettings, addGroup, addCategory, storageMode, setStorageMode } = useSettings(session, setStatus);
  const { history, fetchHistory, handleDeleteHistory, handleBulkDeleteHistory, loadMore, hasMore, isLoadingMore, totalCount, handleEditHistory } = useHistory(session, setStatus, storageMode);
  const { isRecording, isPaused, toggleVoice, pauseVoice, stopVoice } = useVoiceRecording(
    (transcript) => setInput(prev => prev + (prev ? '\n' : '') + transcript),
    setStatus,
  );
  const admin = useAdmin(session, isAdmin, setStatus);
  const { budgets, saveBudget, deleteBudget } = useBudget(session);
  const [dashboardRefreshKey, setDashboardRefreshKey] = React.useState(0);

  const { isOnline, saveOffline } = useOfflineSync(session?.access_token, () => {
    fetchHistory();
    setDashboardRefreshKey(k => k + 1);
  });

  const renameInEntries = async (field: 'group' | 'category', oldName: string, newName: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/entries/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ field, oldName, newName })
      });
      if (!res.ok) return;
      await fetchHistory();
      setDashboardRefreshKey(k => k + 1);
    } catch (e) { console.error('Rename failed', e); }
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const [newGroup, setNewGroup] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [settingsView, setSettingsView] = useState<SettingsView>('menu');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const handleSetTheme = (val: 'dark' | 'light') => { localStorage.setItem('theme', val); setTheme(val); };
  const [tabHistory, setTabHistory] = useState<ActiveTab[]>([]);

  const navigateTab = (tab: ActiveTab) => {
    if (tab !== activeTab) setTabHistory(prev => [...prev, activeTab]);
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
  };

  useEffect(() => {
    if (!session) return;
    fetch(`${window.location.origin}/api/auto-payments/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
    }).then(r => r.json()).then(data => {
      if (data.triggered?.length > 0) toast.success(t('toast_autopay_triggered', { items: data.triggered.join(', ') }), { duration: 5000 });
    }).catch(() => {});
  }, [session?.access_token]);

  // --- Notification Features ---
  useEffect(() => {
    if (!session || !profileReady || !history || history.length === 0) return;

    const today = new Date();
    // Use local date string YYYY-MM-DD
    const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 1. Daily Reminder (Habit)
    const reminderKey = `daily_reminder_${localDateStr}`;
    if (!localStorage.getItem(reminderKey)) {
      const hasTodayEntry = history.some(h => h.date?.startsWith(localDateStr));
      if (!hasTodayEntry) {
        localStorage.setItem(reminderKey, 'true');
        fetch(`${window.location.origin}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ title: 'Daily Reminder ⏰', message: 'ဒီနေ့အတွက် စာရင်းတွေ သွင်းပြီးပြီလား? မေ့မနေနဲ့နော်!', type: 'info' })
        }).catch(() => {});
      }
    }

    // 2. Premium Expiry Warning
    const expiryKey = `premium_expiry_warn_${localDateStr}`;
    if (!localStorage.getItem(expiryKey) && userRole === 'premium') {
      import('./lib/supabase').then(({ supabase }) => {
        supabase.from('profiles').select('premium_expires_at').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.premium_expires_at) {
              const daysLeft = (new Date(data.premium_expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              if (daysLeft > 0 && daysLeft <= 3) {
                localStorage.setItem(expiryKey, 'true');
                fetch(`${window.location.origin}/api/notifications`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                  body: JSON.stringify({ title: 'Premium သက်တမ်းကုန်တော့မည် ⚠️', message: `သင်၏ Premium သက်တမ်းသည် နောက် ${Math.ceil(daysLeft)} ရက်အကြာတွင် ကုန်ဆုံးပါမည်။ ဆက်လက်အသုံးပြုနိုင်ရန် သက်တမ်းတိုးပေးပါ။`, type: 'warning' })
                }).catch(() => {});
              }
            }
          });
      });
    }
  }, [session, profileReady, history.length, userRole]);

  useEffect(() => {
    if (!window.history.state?.app) window.history.replaceState({ app: true }, '');
    window.history.pushState({ app: true }, '');
    const handlePopState = () => {
      window.history.pushState({ app: true }, '');
      if (showCredentialsModal) { setShowCredentialsModal(false); return; }
      if (showAddSheet) { setShowAddSheet(false); return; }
      if (showSettings) {
        if (settingsView !== 'menu') { setSettingsView('menu'); return; }
        setShowSettings(false); return;
      }
      if (tabHistory.length > 0) {
        const prev = tabHistory[tabHistory.length - 1];
        setTabHistory(h => h.slice(0, -1));
        setActiveTab(prev); return;
      }
      if (activeTab !== 'home') { setActiveTab('home'); return; }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showAddSheet, showSettings, settingsView, activeTab, tabHistory, showCredentialsModal]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pullDistance, isRefreshing, progress } = usePullToRefresh({ onRefresh: async () => { await fetchHistory(); }, containerRef });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setStatus({ type: 'error', message: translateError('3MB') });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setImage({ data: base64, mediaType: file.type });
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null); setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseInput = async () => {
    if (!session) return;
    if (!geminiKey) { setShowCredentialsModal(true); setStatus({ type: 'error', message: translateError('API credentials missing.') }); return; }
    if (storageMode === 'notion' && (!notionKey || !notionDbId)) { setShowCredentialsModal(true); setStatus({ type: 'error', message: translateError('API credentials missing.') }); return; }
    if (!input && !image) { toast.error(t('input_required')); setStatus({ type: 'error', message: t('input_required') }); return; }
    setIsParsing(true);
    setStatus({ type: 'loading', message: t('input_ai_parsing') });
    setParsedEntries([]);
    try {
      const res = await fetch(`${window.location.origin}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: input, image, groups, categories }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseHttpError(text, res.status));
      const data = JSON.parse(text);
      setParsedEntries(data.data);
      toast.success(t('input_ai_success'));
      setStatus(null);
    } catch (err: any) {
      const translatedMsg = translateError(err.message);
      toast.error(translatedMsg);
      setStatus({ type: 'error', message: translatedMsg });
    } finally { setIsParsing(false); }
  };

  const saveManualEntry = async (entry: Partial<Entry>) => {
    if (!session) return;
    if (!isOnline) {
      saveOffline(`${window.location.origin}/api/entries`, { entries: [entry] });
      return;
    }
    try {
      const res = await fetch(`${window.location.origin}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ entries: [entry] }),
      });
      if (!res.ok) throw new Error(t('toast_save_failed'));
      toast.success(t('toast_entry_saved'));
      const updatedHistory = await fetchHistory();
      if (entry.expense && entry.group) {
        const budget = budgets.find(b => b.group_name === entry.group);
        if (budget) {
          const now = new Date();
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const freshHistory = Array.isArray(updatedHistory) ? updatedHistory : history;
          const monthTotal = freshHistory.filter(h => h.date?.startsWith(monthStr) && h.group === entry.group && h.expense).reduce((s, h) => s + (h.expense ?? 0), 0);
          if (monthTotal > budget.amount) {
            const msg = t('toast_budget_exceeded', { group: entry.group, spent: monthTotal.toLocaleString(), limit: budget.amount.toLocaleString() });
            toast.warning(msg, { duration: 5000 });
            
            // Push Notification
            fetch(`${window.location.origin}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ title: 'Budget Alert ⚠️', message: msg, type: 'warning' })
            }).catch(() => {});
          }
        }
      }
    } catch (err: any) { toast.error(translateError(err.message)); }
  };

  const saveToApp = async () => {
    if (!session) return;
    if (!isOnline) {
      saveOffline(`${window.location.origin}/api/entries`, { entries: parsedEntries });
      setInput(''); removeImage(); setParsedEntries([]);
      return;
    }
    setIsSending(true);
    setStatus({ type: 'loading', message: t('saving') });
    try {
      const res = await fetch(`${window.location.origin}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ entries: parsedEntries }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseHttpError(text, res.status));
      toast.success(t('toast_entries_saved', { count: parsedEntries.length }));
      setStatus({ type: 'success', message: t('toast_entries_saved', { count: parsedEntries.length }) });
      setInput(''); removeImage(); setParsedEntries([]);
      fetchHistory();
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg); setStatus({ type: 'error', message: msg });
    } finally { setIsSending(false); }
  };

  const sendToNotion = async () => {
    if (!session) return;
    if (!notionKey || !notionDbId) { toast.error(t('toast_notion_missing')); setStatus({ type: 'error', message: t('toast_notion_missing') }); return; }
    if (!isOnline) {
      saveOffline(`${window.location.origin}/api/notion`, { entries: parsedEntries });
      setInput(''); removeImage(); setParsedEntries([]);
      return;
    }
    setIsSending(true);
    setStatus({ type: 'loading', message: 'Sending to Notion...' });
    try {
      const res = await fetch(`${window.location.origin}/api/notion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ entries: parsedEntries }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(parseHttpError(text, res.status));
      const data = JSON.parse(text);
      const succeeded = data.results.filter((r: any) => r.success);
      const failed = data.results.filter((r: any) => !r.success);
      if (failed.length === 0) {
        toast.success(t('toast_notion_all_success', { count: parsedEntries.length }));
        setStatus({ type: 'success', message: t('toast_notion_all_success', { count: parsedEntries.length }) });
      } else if (succeeded.length > 0) {
        toast.warning(t('toast_notion_partial', { success: succeeded.length, failed: failed.length }));
        setStatus({ type: 'error', message: t('toast_notion_partial', { success: succeeded.length, failed: failed.length }) });
      } else {
        toast.error(t('toast_notion_all_failed'));
        setStatus({ type: 'error', message: t('toast_notion_all_failed') });
      }
      setInput(''); removeImage(); setParsedEntries([]);
      fetchHistory();
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      const translatedMsg = translateError(err.message);
      toast.error(translatedMsg); setStatus({ type: 'error', message: translatedMsg });
      
      // Push Notification
      fetch(`${window.location.origin}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ title: 'Notion Sync Error ❌', message: translatedMsg, type: 'error' })
      }).catch(() => {});
      
    } finally { setIsSending(false); }
  };

  const updateParsedEntry = (index: number, updatedEntry: Entry) => {
    const newEntries = [...parsedEntries]; newEntries[index] = updatedEntry; setParsedEntries(newEntries);
  };
  const removeParsedEntry = (index: number) => { setParsedEntries(parsedEntries.filter((_, i) => i !== index)); };

  const currentBudgetExpenses = React.useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map: Record<string, number> = {};
    history.forEach(e => { if (e.date?.startsWith(monthStr) && e.expense && e.group) map[e.group] = (map[e.group] ?? 0) + e.expense; });
    return map;
  }, [history]);

  // Profile မဆွဲရသေးခင် blank screen / flicker မဖြစ်အောင်
  if (!profileReady) return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#7c6aff]/30 border-t-[#7c6aff] rounded-full animate-spin" />
    </div>
  );

  if (!session) return <AuthForm status={status} setStatus={setStatus} />;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; color: string; activeBg: string }[] = [
    { id: 'home',        label: t('nav_home'),         icon: <Home size={17} />,     color: '#a78bfa', activeBg: 'bg-[#7c6aff]/15' },
    { id: 'dashboard',   label: t('nav_dashboard'),    icon: <BarChart2 size={17} />, color: '#f59e0b', activeBg: 'bg-[#f59e0b]/15' },
    { id: 'budget',      label: t('nav_budget'),       icon: <Target size={17} />,   color: '#34d399', activeBg: 'bg-[#34d399]/15' },
    { id: 'data',        label: t('nav_transactions'), icon: <FolderOpen size={17} />,color: '#60a5fa', activeBg: 'bg-[#60a5fa]/15' },
    { id: 'profile',     label: t('nav_profile'),      icon: <User size={17} />,     color: '#f472b6', activeBg: 'bg-[#f472b6]/15' },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[#7c6aff]/30">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[80%] h-[50%] bg-[#7c6aff18] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[60%] h-[40%] bg-[#34d39910] blur-[120px] rounded-full" />
      </div>

      {/* Pull-to-refresh */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 || isRefreshing ? `${pullDistance || 50}px` : '0px' }}>
        <div className="flex items-center gap-2 transition-all duration-200" style={{ opacity: progress }}>
          <svg className={`w-5 h-5 text-[#7c6aff] transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" strokeLinecap="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[11px] font-bold text-[#a78bfa]">
            {isRefreshing ? t('refreshing') : progress >= 1 ? t('release_to_refresh') : t('pull_to_refresh')}
          </span>
        </div>
      </div>

      {/* Floating Add Button */}
      <AnimatePresence>
        {activeTab === 'home' && (
          <motion.button onClick={() => setShowAddSheet(true)} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} whileTap={{ scale: 0.92 }}
            className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7c6aff] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-[#7c6aff]/40">
            <Plus size={22} className="text-white" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <BumpNavbar tabs={tabs} activeTab={activeTab} setActiveTab={navigateTab} />

      {activeTab === 'dashboard' && storageMode === 'app' && (
        <div className="relative z-10">
          <div className="max-w-[95%] mx-auto px-2 sm:px-6 pt-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--text-primary)]">{t('dashboard_title')}</h2>
            <div className="flex items-center gap-2">
              <NotificationBell session={session} />
              <button onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all">
                <Settings size={18} />
              </button>
            </div>
          </div>
          <Dashboard session={session} storageMode={storageMode} budgets={budgets} refreshKey={dashboardRefreshKey} />
        </div>
      )}

      {activeTab === 'budget' && storageMode === 'app' && (
        <div className="relative z-10 max-w-[95%] mx-auto px-2 sm:px-6 pb-28 pt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black">{t('nav_budget')}</h2>
            <div className="flex items-center gap-2">
              <NotificationBell session={session} />
              <motion.button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all shrink-0 shadow-sm">
                <Settings size={20} />
              </motion.button>
            </div>
          </div>
          <BudgetSettings groups={groups} budgets={budgets} onSave={saveBudget} onDelete={deleteBudget} currentExpenses={currentBudgetExpenses} session={session} />
        </div>
      )}

      {activeTab === 'data' && storageMode === 'app' && (
        <div className="relative z-10 w-full px-2 sm:px-4 pb-24 pt-8 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">{t('nav_transactions')}</h2>
            <div className="flex items-center gap-2">
              <NotificationBell session={session} />
              <motion.button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all shrink-0 shadow-sm">
                <Settings size={20} />
              </motion.button>
            </div>
          </div>
          <DataTable entries={history} groups={groups} categories={categories} onDelete={handleDeleteHistory} onEdit={handleEditHistory} onAddGroup={addGroup} onAddCategory={addCategory} storageMode={storageMode} session={session} />
        </div>
      )}

      {storageMode === 'notion' && (activeTab === 'dashboard' || activeTab === 'budget' || activeTab === 'data') && (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-8 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">{t('feature_unavailable_title')}</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-[260px]">
              {t('feature_unavailable_desc')}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <Profile session={session} isAdmin={isAdmin} theme={theme} setTheme={handleSetTheme} storageMode={storageMode} setStorageMode={setStorageMode} history={history} totalCount={totalCount} handleLogout={handleLogout} onOpenSettings={() => setShowSettings(true)} onOpenPremium={() => { setShowSettings(true); setSettingsView('premium'); }} />
      )}

      {activeTab === 'home' && (
        <div className="relative z-10 max-w-[95%] mx-auto px-2 sm:px-6 pb-24">
          <header className="pt-8 pb-6 sm:py-10">
            <div className="flex items-center justify-between">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 sm:gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-[#7c6aff]/20 blur-lg rounded-xl" />
                  <img src="/inlogo.png" alt="App Logo" className="w-11 h-11 sm:w-14 sm:h-14 relative z-10 rounded-xl object-cover border border-[var(--border-color)] shadow-sm" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-[#7c6aff] to-[#34d399] bg-clip-text text-transparent truncate">{t('auth_app_name')}</h1>
                  <p className="text-[10px] sm:text-xs font-semibold text-text-muted tracking-tight mt-0.5 leading-tight">{t('home_tagline')}</p>
                </div>
              </motion.div>
              <div className="flex items-center gap-2">
                <NotificationBell session={session} />
                <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onClick={() => setShowSettings(true)}
                  className="w-10 h-10 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/50 transition-all shrink-0 shadow-sm">
                  <Settings size={20} />
                </motion.button>
              </div>
            </div>
          </header>

          <InputCard input={input} setInput={setInput} previewUrl={previewUrl} removeImage={removeImage} toggleVoice={toggleVoice} pauseVoice={pauseVoice} stopVoice={stopVoice} isRecording={isRecording} isPaused={isPaused} handleImageChange={handleImageChange} fileInputRef={fileInputRef} parseInput={parseInput} isParsing={isParsing} image={image} session={session!} userRole={userRole} isAdmin={isAdmin} groups={groups} categories={categories} onImportComplete={fetchHistory} onOpenPremium={() => { setShowSettings(true); setSettingsView('premium'); }} isOnline={isOnline} />

          <ParsedEntries entries={parsedEntries} isSending={isSending} sendToNotion={storageMode === 'notion' ? sendToNotion : saveToApp} storageMode={storageMode} onEdit={updateParsedEntry} onRemove={removeParsedEntry} groups={groups} categories={categories} onAddGroup={addGroup} onAddCategory={addCategory} />

          {history.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-tight text-text-muted">{t('home_recent_activity')}</span>
                <button onClick={() => navigateTab('data')} className="text-[10px] font-bold text-[#a78bfa] hover:underline">{t('home_see_all')}</button>
              </div>
              <div className="space-y-1.5">
                {history.slice(0, 3).map((entry) => {
                  const isIncome = entry.income && entry.income > 0;
                  const amount = isIncome ? entry.income : entry.expense;
                  return (
                    <div key={entry.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isIncome ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{entry.item}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{entry.date} · {entry.category}</div>
                      </div>
                      <div className={`font-mono text-xs font-black shrink-0 ${isIncome ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                        {isIncome ? '+' : '-'}{amount?.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <SettingsDrawer
        showSettings={showSettings} setShowSettings={setShowSettings}
        settingsView={settingsView} setSettingsView={setSettingsView}
        isAdmin={isAdmin} status={status}
        admin={admin}
        geminiKey={geminiKey} setGeminiKey={setGeminiKey}
        notionKey={notionKey} setNotionKey={setNotionKey}
        notionDbId={notionDbId} setNotionDbId={setNotionDbId}
        showGemini={showGemini} setShowGemini={setShowGemini}
        showNotion={showNotion} setShowNotion={setShowNotion}
        showNotionDb={showNotionDb} setShowNotionDb={setShowNotionDb}
        copiedField={copiedField} handleCopy={handleCopy}
        saveSettings={async () => { await saveSettings(); setDashboardRefreshKey(k => k + 1); }}
        storageMode={storageMode} setStorageMode={setStorageMode}
        groups={groups} setGroups={setGroups}
        newGroup={newGroup} setNewGroup={setNewGroup}
        categories={categories} setCategories={setCategories}
        newCategory={newCategory} setNewCategory={setNewCategory}
        history={history}
        onDeleteHistory={handleDeleteHistory} onBulkDeleteHistory={handleBulkDeleteHistory}
        onLoadMore={loadMore} hasMore={hasMore} isLoadingMore={isLoadingMore} totalCount={totalCount}
        userEmail={session.user.email ?? ''} handleLogout={handleLogout}
        onRenameGroup={(oldName, newName) => renameInEntries('group', oldName, newName)}
        onRenameCategory={(oldName, newName) => renameInEntries('category', oldName, newName)}
        session={session} onRenameComplete={() => setDashboardRefreshKey(k => k + 1)} userRole={userRole}
      />

      <EntrySheet open={showAddSheet} onClose={() => setShowAddSheet(false)} onSave={saveManualEntry} groups={groups} categories={categories} onAddGroup={addGroup} onAddCategory={addCategory} mode="add" />

      <Toaster richColors position="top-center" />


      <AnimatePresence>
        {showCredentialsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <button onClick={() => setShowCredentialsModal(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"><X size={20} /></button>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><AlertCircle size={32} /></div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-text-primary">{t('api_credentials_required')}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{t('api_credentials_desc')}</p>
                </div>
                <div className="w-full pt-2 space-y-3">
                  <button onClick={() => { setShowCredentialsModal(false); setShowSettings(true); setSettingsView('api'); }}
                    className="w-full h-12 rounded-xl bg-[#7c6aff] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#a78bfa] transition-all shadow-lg shadow-[#7c6aff]/20">
                    <Settings size={18} /> {t('go_to_settings')}
                  </button>
                  <button onClick={() => setShowCredentialsModal(false)}
                    className="w-full h-12 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-bold hover:text-text-primary transition-all">
                    {t('btn_close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}