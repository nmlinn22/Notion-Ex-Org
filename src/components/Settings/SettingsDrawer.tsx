import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, User, Send, History, Plus, Loader2, CheckCircle2, AlertCircle, LogOut, Crown, Zap, Lightbulb, FolderOpen, Calendar, Cloud, MessageCircle, Globe } from 'lucide-react';
import { SettingsView, Status, Entry } from '../../types';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AdminPanel } from './AdminPanel';
import { ApiSettings } from './ApiSettings';
import { NotionGuide } from './NotionGuide';
import { CustomizeSettings } from './CustomizeSettings';
import { HistorySettings } from './HistorySettings';
import { ContactSettings } from './ContactSettings';
import { AutoPayments } from './AutoPayments';
import { BackupRestore } from './BackupRestore';
import { PremiumPackage } from './PremiumPackage';
import { useLanguage } from '../../lib/LanguageContext';

interface SettingsDrawerProps {
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  settingsView: SettingsView;
  setSettingsView: (val: SettingsView) => void;
  isAdmin: boolean;
  status: Status | null;
  pendingUsers: any[];
  userStats: Record<string, { count: number; last_active: string }>;
  handleSetAdmin: (userId: string, makeAdmin: boolean) => void;
  handleSetRole: (userId: string, role: 'member' | 'premium' | 'admin') => void;
  handleDeleteUser: (userId: string, userEmail: string) => void;
  geminiKey: string;
  setGeminiKey: (val: string) => void;
  notionKey: string;
  setNotionKey: (val: string) => void;
  notionDbId: string;
  setNotionDbId: (val: string) => void;
  showGemini: boolean;
  setShowGemini: (val: boolean) => void;
  showNotion: boolean;
  setShowNotion: (val: boolean) => void;
  showNotionDb: boolean;
  setShowNotionDb: (val: boolean) => void;
  copiedField: string | null;
  handleCopy: (text: string, field: string) => void;
  saveSettings: () => void;
  storageMode: 'app' | 'notion';
  setStorageMode: (val: 'app' | 'notion') => void;
  groups: string[];
  setGroups: (val: string[]) => void;
  newGroup: string;
  setNewGroup: (val: string) => void;
  categories: string[];
  setCategories: (val: string[]) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  history: Entry[];
  onDeleteHistory: (id: number) => void;
  onBulkDeleteHistory: (ids: number[]) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  totalCount: number;
  userEmail: string;
  handleLogout: () => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  onRenameCategory?: (oldName: string, newName: string) => void;
  session?: Session | null;
  onRenameComplete?: () => void;
  userRole?: string;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  showSettings,
  setShowSettings,
  settingsView,
  setSettingsView,
  isAdmin,
  status,
  pendingUsers,
  userStats,
  handleSetAdmin,
  handleSetRole,
  handleDeleteUser,
  geminiKey, setGeminiKey,
  notionKey, setNotionKey,
  notionDbId, setNotionDbId,
  showGemini, setShowGemini,
  showNotion, setShowNotion,
  showNotionDb, setShowNotionDb,
  copiedField, handleCopy,
  saveSettings,
  storageMode, setStorageMode,
  groups, setGroups,
  newGroup, setNewGroup,
  categories, setCategories,
  newCategory, setNewCategory,
  history,
  onDeleteHistory,
  onBulkDeleteHistory,
  onLoadMore,
  hasMore,
  isLoadingMore,
  totalCount,
  userEmail,
  handleLogout,
  onRenameGroup,
  onRenameCategory,
  session,
  onRenameComplete,
  userRole = 'member',
}) => {
  const { lang, setLang, t } = useLanguage();
  const [canUseNotion, setCanUseNotion] = React.useState(false);
  React.useEffect(() => {
    if (!session) return;
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => {
        setCanUseNotion(data?.role === 'premium' || data?.role === 'admin');
      });
  }, [session]);
  const isPremiumUser = isAdmin || userRole === 'premium' || userRole === 'admin';
  const viewTitle: Record<string, string> = {
    menu: t('settings_title'),
    admin: t('settings_admin_panel'),
    api: t('settings_api_credentials'),
    notion: t('settings_notion_guide'),
    customize: t('settings_customize'),
    history: t('settings_history_title'),
    contact: t('settings_contact'),
    backup: t('settings_backup'),
    autopayments: t('settings_auto_payments'),
    premium: '👑 Premium Package',
  };

  return (
    <AnimatePresence>
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => window.history.back()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`relative h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl flex flex-col transition-all duration-300 ${
              settingsView === 'menu' ? 'w-[85%] sm:w-[380px]' : 'w-full'
            }`}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {settingsView !== 'menu' && (
                  <button
                    onClick={() => window.history.back()}
                    className="w-8 h-8 rounded-lg bg-[var(--bg-input)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-bold">{viewTitle[settingsView] ?? settingsView}</h2>
                  {settingsView === 'menu' && (
                    <span className="text-[10px] font-medium text-text-muted truncate max-w-[180px] block">
                      {userEmail}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (settingsView !== 'menu') {
                    window.history.go(-2);
                  } else {
                    window.history.back();
                  }
                }}
                className="w-8 h-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] flex items-center justify-center text-text-muted hover:text-text-primary transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3.5 custom-scrollbar">
              {status && (
                <div className={`p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-2 mb-3 border ${
                  status.type === 'loading' ? 'bg-[#7c6aff15] border-[#7c6aff30] text-[#a78bfa]' :
                  status.type === 'success' ? 'bg-[#34d39915] border-[#34d39930] text-[#34d399]' :
                  'bg-[#f8717115] border-[#f8717130] text-[#f87171]'
                }`}>
                  {status.type === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
                   status.type === 'success' ? <CheckCircle2 size={14} /> :
                   <AlertCircle size={14} />}
                  {status.message}
                </div>
              )}

              {settingsView === 'menu' ? (
                <div className="space-y-1.5">

                  {/* Premium Package — top of menu, free users only */}
                  {!isPremiumUser && (
                    <button
                      onClick={() => setSettingsView('premium')}
                      className="w-full p-2.5 rounded-xl bg-[#7c6aff]/5 border border-[#7c6aff]/25 flex items-center justify-between text-text-primary hover:bg-[#7c6aff]/10 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#7c6aff]/15 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-[#7c6aff]/20">
                          <Crown size={18} className="text-[#7c6aff]" />
                        </div>
                        <div>
                          <span className="text-sm font-bold tracking-tight text-[#a78bfa]">Premium Package</span>
                          <p className="text-[10px] text-text-muted leading-none mt-0.5">Unlock all premium features</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#7c6aff] group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  {/* Admin Panel — admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => setSettingsView('admin')}
                      className="w-full p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between text-amber-500 hover:bg-amber-500/10 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/20">
                          <Crown size={18} className="text-amber-500" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">{t('settings_admin_panel')}</span>
                      </div>
                      <ChevronRight size={16} className="text-amber-500/40 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  {/* Storage & API */}
                  <button
                    onClick={() => setSettingsView('api')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-blue-500/20">
                        <Zap size={18} className="text-blue-500" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{t('settings_api_credentials')}</span>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Language Switcher */}
                  <div className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                        <Globe size={18} className="text-emerald-500" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">Language/ဘာသာစကား</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[var(--bg-main)] rounded-xl p-1 border border-[var(--border-color)]">
                      <button
                        onClick={() => setLang('en')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setLang('my')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${lang === 'my' ? 'bg-emerald-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                      >
                        မြန်မာ
                      </button>
                    </div>
                  </div>

                  {/* Notion Guide */}
                  <button
                    onClick={() => setSettingsView('notion')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-indigo-500/20">
                        <Lightbulb size={18} className="text-indigo-500" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{t('settings_notion_guide')}</span>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Groups & Categories */}
                  <button
                    onClick={() => setSettingsView('customize')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-violet-500/20">
                        <FolderOpen size={18} className="text-violet-500" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{t('settings_customize')}</span>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* History — Notion Sync mode only */}
                  {storageMode === 'notion' && (
                    <button
                      onClick={() => setSettingsView('history')}
                      className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-indigo-500/20">
                          <History size={18} className="text-indigo-500" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">{t('settings_history')}</span>
                      </div>
                      <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}

                  {/* Auto Payments */}
                  <button
                    onClick={() => setSettingsView(isPremiumUser ? 'autopayments' : 'autopayments')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-emerald-500/20">
                        <Calendar size={18} className="text-emerald-500" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold tracking-tight">{t('settings_auto_payments')}</span>
                        {!isPremiumUser && (
                          <Crown size={11} className="text-amber-400" />
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Backup & Restore */}
                  <button
                    onClick={() => setSettingsView(isPremiumUser ? 'backup' : 'backup')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#7c6aff]/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-[#7c6aff]/20">
                        <Cloud size={18} className="text-[#7c6aff]" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold tracking-tight">{t('settings_backup')}</span>
                        {!isPremiumUser && (
                          <Crown size={11} className="text-amber-400" />
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>


                  {/* Contact */}
                  <button
                    onClick={() => setSettingsView('contact')}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-between text-text-primary hover:bg-[var(--bg-hover)] transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm shadow-pink-500/20">
                        <MessageCircle size={18} className="text-pink-500" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">{t('settings_contact')}</span>
                    </div>
                    <ChevronRight size={16} className="text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                </div>
              ) : (
                <div className="space-y-4 max-w-[600px] mx-auto">
                  {settingsView === 'admin' && (
                    <AdminPanel
                      pendingUsers={pendingUsers}
                      userStats={userStats}
                      handleSetRole={handleSetRole}
                      handleDeleteUser={handleDeleteUser}
                      currentUserEmail={userEmail}
                    />
                  )}
                  {settingsView === 'api' && (
                    <ApiSettings
                      geminiKey={geminiKey} setGeminiKey={setGeminiKey}
                      notionKey={notionKey} setNotionKey={setNotionKey}
                      notionDbId={notionDbId} setNotionDbId={setNotionDbId}
                      showGemini={showGemini} setShowGemini={setShowGemini}
                      showNotion={showNotion} setShowNotion={setShowNotion}
                      showNotionDb={showNotionDb} setShowNotionDb={setShowNotionDb}
                      copiedField={copiedField} handleCopy={handleCopy}
                      saveSettings={saveSettings}
                      storageMode={storageMode} setStorageMode={setStorageMode}
                      canUseNotion={canUseNotion}
                      onOpenPremium={() => setSettingsView('premium')}
                    />
                  )}
                  {settingsView === 'notion' && <NotionGuide onOpenPremium={() => setSettingsView('premium')} />}
                  {settingsView === 'customize' && (
                    <CustomizeSettings
                      groups={groups} setGroups={setGroups}
                      newGroup={newGroup} setNewGroup={setNewGroup}
                      categories={categories} setCategories={setCategories}
                      newCategory={newCategory} setNewCategory={setNewCategory}
                      saveSettings={saveSettings}
                      onRenameGroup={onRenameGroup}
                      onRenameCategory={onRenameCategory}
                      session={session}
                      onRenameComplete={onRenameComplete}
                    />
                  )}
                  {settingsView === 'history' && (
                    <HistorySettings
                      history={history}
                      onDelete={onDeleteHistory}
                      onBulkDelete={onBulkDeleteHistory}
                      onLoadMore={onLoadMore}
                      hasMore={hasMore}
                      isLoadingMore={isLoadingMore}
                      totalCount={totalCount}
                    />
                  )}
                  {settingsView === 'contact' && <ContactSettings />}

                  {settingsView === 'backup' && session && (
                    <BackupRestore
                      session={session}
                      userRole={userRole}
                      isAdmin={isAdmin}
                      onOpenPremium={() => setSettingsView('premium')}
                    />
                  )}

                  {settingsView === 'autopayments' && session && (
                    <AutoPayments
                      session={session}
                      userRole={userRole}
                      isAdmin={isAdmin}
                      groups={groups}
                      categories={categories}
                      onOpenPremium={() => setSettingsView('premium')}
                    />
                  )}

                  {settingsView === 'premium' && (
                    <PremiumPackage userEmail={session?.user?.email} />
                  )}
                </div>
              )}
            </div>

            {/* Footer — Logout */}
            {settingsView === 'menu' && (
              <div className="p-3.5 border-t border-[var(--border-color)] shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  {t('auth_sign_out')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};